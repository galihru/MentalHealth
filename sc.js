import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify } from 'html-minifier';

// Fungsi untuk menghasilkan nonce acak
function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

const bfcacheScript = `
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Page restored from bfcache');
    }
});

window.addEventListener('pagehide', function(event) {
    console.log('Page is being unloaded');
});

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        console.log('Page hidden, prepare for restoration');
    }
});
`;

// Fungsi untuk memproses HTML (Minify + Nonce + bfcache script)
function processHTML(inputFilePath, outputFilePath) {
    try {
        // Baca file HTML
        let htmlContent = fs.readFileSync(inputFilePath, 'utf8');

        // 1. Atribut lang & xml:lang
        htmlContent = htmlContent.replace(/<html\s*([^>]*)>/i, (match, attributes) => {
            let filteredAttrs = attributes
                .replace(/\s+(lang|xml:lang)=["'][^"']*["']/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            return `<html ${filteredAttrs} lang="en" xml:lang="en">`;
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

// Contoh penggunaan
const inputPath = path.resolve('prerelease.html');  // Ubah sesuai dengan lokasi file input
const outputPath = path.resolve('index.html'); // Lokasi file output

processHTML(inputPath, outputPath);
