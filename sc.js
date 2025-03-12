import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify } from 'html-minifier';

function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

const bfcacheScript = `
performance.mark('app-init-start');

function loadThirdParty(element) {
    const actualSrc = element.dataset.src;
    const actualType = element.dataset.type;
    
    if (actualType === 'script') {
        const script = document.createElement('script');
        script.src = actualSrc;
        script.async = true;
        element.parentNode.replaceChild(script, element);
    } else if (actualType === 'iframe') {
        const iframe = document.createElement('iframe');
        iframe.src = actualSrc;
        Object.assign(iframe, {
            width: element.dataset.width || '100%',
            height: element.dataset.height || '100%',
            frameborder: '0'
        });
        element.parentNode.replaceChild(iframe, element);
    }
    
    performance.mark('third-party-load-' + actualSrc);
    performance.measure('third-party-loading', 'app-init-start', 'third-party-load-' + actualSrc);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadThirdParty(entry.target);
            observer.unobserve(entry.target);
        }
    });
}, {
    rootMargin: '50px'
});
window.addEventListener('pageshow', function(event) {
    performance.mark('pageshow-start');
    if (event.persisted) {
        console.log('Page restored from bfcache');
        performance.measure('bfcache-restoration', 'pageshow-start');
    }
});

window.addEventListener('load', function() {
    performance.mark('page-load-complete');
    performance.measure('total-page-load', 'app-init-start', 'page-load-complete');
    
    // Initialize lazy loading
    document.querySelectorAll('[data-lazy]').forEach(element => {
        observer.observe(element);
    });
});

// Send performance metrics to analytics
function sendPerformanceMetrics() {
    const metrics = performance.getEntriesByType('measure');
    console.log('Performance metrics:', metrics);
    // Here you could send these metrics to your analytics service
}


window.addEventListener('pagehide', function(event) {
    console.log('Page is being unloaded');
});

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        performance.mark('page-hide');
        performance.measure('page-visible-duration', 'app-init-start', 'page-hide');
        sendPerformanceMetrics();
        console.log('Page hidden, prepare for restoration');
    }
});
`;

function processHTML(inputFilePath, outputFilePath) {
    try {
        let htmlContent = fs.readFileSync(inputFilePath, 'utf8');
        
        // 1. Atribut lang & xml:lang
        htmlContent = htmlContent.replace(/<html\s*([^>]*)>/i, (match, attributes) => {
            let filteredAttrs = attributes
                .replace(/\s+(lang|xml:lang)=["'][^"']*["']/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            return `<html ${filteredAttrs} lang='"en"' xml:lang='"en"'>`;
        });

        // 2. Video captions
        htmlContent = htmlContent.replace(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi, (match, videoAttrs, innerContent) => {
            if (!/<track\s[^>]*kind=["']captions["']/gi.test(innerContent)) {
                innerContent += `<track kind="captions" src="captions.vtt" srclang="en" label="English">`;
            }
            return `<video${videoAttrs}>${innerContent}</video>`;
        });

        // 3. ARIA dialog accessible name
        htmlContent = htmlContent.replace(/<div\b([^>]*)\bclass=["']modal["']([^>]*)>/gi, (match, attrs1, attrs2) => {
            let allAttrs = `${attrs1} ${attrs2}`.trim();
            if (/role=["'](dialog|alertdialog)["']/gi.test(allAttrs)) {
                if (!/(aria-labelledby|aria-label)=["'][^"']*["']/gi.test(allAttrs)) {
                    allAttrs += ` aria-labelledby="modal-title"`;
                }
            }
            return `<div class="modal" ${allAttrs}>`;
        });

        // 4. Parent-child ARIA roles
        htmlContent = htmlContent.replace(/<ul\b([^>]*)\brole=["']menu["']([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs1, attrs2, innerContent) => {
            if (!/<li\b[^>]*\brole=["']menuitem["']/gi.test(innerContent)) {
                innerContent = innerContent.replace(/<li\b([^>]*)>/gi, `<li$1 role="menuitem">`);
            }
            return `<ul${attrs1} role="menu"${attrs2}>${innerContent}</ul>`;
        });

        // 5. ARIA meter accessible name
        htmlContent = htmlContent.replace(/<([^\s>]+)\b([^>]*)\brole=["']meter["']([^>]*)>/gi, (match, tagName, attrs1, attrs2) => {
            const allAttrs = `${attrs1} ${attrs2}`.trim();
            if (!/(aria-label|aria-labelledby)=["']/.test(allAttrs)) {
                return `<${tagName}${attrs1} role="meter" aria-label="Progress meter"${attrs2}>`;
            }
            return match;
        });

        // 6. Perbaiki duplikat ARIA IDs
        const idMap = new Map();
        let idCounter = 1;
        const allIds = new Set([...htmlContent.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));
        htmlContent = htmlContent.replace(/\bid=["']([^"']+)["']/gi, (match, idValue) => {
            if (allIds.has(idValue)) {
                allIds.delete(idValue);
                return match;
            } else {
                const newId = `${idValue}-${idCounter++}`;
                idMap.set(idValue, newId);
                return `id="${newId}"`;
            }
        });
        idMap.forEach((newId, oldId) => {
            htmlContent = htmlContent.replace(new RegExp(`(aria-labelledby|aria-describedby)=["'](.*?)\\b${oldId}\\b(.*?)["']`, 'gi'), (match, attr, before, after) => {
                return `${attr}="${before}${newId}${after}"`;
            });
        });

        htmlContent = htmlContent.replace(
            /<script\s+src="(https?:\/\/[^"]+)"([^>]*)>/gi,
            (match, src, attrs) => {
                if (src.includes('analytics') || src.includes('tracking') || src.includes('ads')) {
                    return `<div data-lazy data-type="script" data-src="${src}" style="display:none;"></div>`;
                }
                return match;
            }
        );

        htmlContent = htmlContent.replace(
            /<iframe\s+src="(https?:\/\/[^"]+)"([^>]*)>/gi,
            (match, src, attrs) => {
                const width = attrs.match(/width="([^"]+)"/) ? attrs.match(/width="([^"]+)"/)[1] : '100%';
                const height = attrs.match(/height="([^"]+)"/) ? attrs.match(/height="([^"]+)"/)[1] : '100%';
                return `<div data-lazy data-type="iframe" data-src="${src}" data-width="${width}" data-height="${height}" class="lazy-iframe-placeholder"></div>`;
            }
        );

        // Cari semua nonce yang ada di file
        let nonceMatches = [...htmlContent.matchAll(/nonce="([^"]+)"/g)].map(match => match[1]);

        let nonce;
        if (nonceMatches.length === 0) {
            // Jika tidak ada nonce, buat nonce baru
            nonce = generateNonce();
        } else {
            // Jika ada lebih dari satu nonce berbeda, hapus semua dan buat satu nonce baru
            const uniqueNonces = new Set(nonceMatches);
            nonce = uniqueNonces.size > 1 ? generateNonce() : nonceMatches[0];
        }

        // Hapus semua nonce lama dan ganti dengan satu nonce baru
        htmlContent = htmlContent.replace(/nonce="([^"]+)"/g, '');
        htmlContent = htmlContent.replace(/<script(.*?)>/g, `<script$1 nonce="${nonce}">`);

        // Tambahkan script bfcache hanya jika belum ada
        if (!htmlContent.includes('Page restored from bfcache')) {
            htmlContent = htmlContent.replace('</body>', `<script nonce="${nonce}">${bfcacheScript}</script></body>`);
        }

        // Minifikasi HTML, termasuk inline JS & CSS
        const minifiedHTML = minify(htmlContent, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            minifyJS: true,
            minifyCSS: true,
            collapseBooleanAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            removeOptionalTags: false,
            removeTagWhitespace: false,
            processConditionalComments: true,
            removeAttributeQuotes: true,
            sortAttributes: true,
            sortClassName: true,
        });

        // Simpan output ke file baru
        fs.writeFileSync(outputFilePath, minifiedHTML, 'utf8');

        console.log(`Minifikasi selesai & bfcache script ditambahkan. Hasil disimpan di: ${outputFilePath}`);
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
}

const inputPath = path.resolve(process.env.GITHUB_WORKSPACE, 'prerelease.html');
const outputPath = path.resolve(process.env.GITHUB_WORKSPACE, 'index.html');
const inputPaths = path.resolve(process.env.GITHUB_WORKSPACE, 'about-us/template.html');
const outputPaths = path.resolve(process.env.GITHUB_WORKSPACE, 'about-us/index.html');

processHTML(inputPath, outputPath);
processHTML(inputPaths, outputPaths);
