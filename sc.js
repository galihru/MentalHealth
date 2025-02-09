import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify } from 'html-minifier';

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

// Fungsi untuk generate hash nama class
function generateClassMapping(classes) {
  const mapping = {};
  for (const className of classes) {
    const hash = crypto.createHash('sha1').update(className).digest('hex').substring(0, 8);
    mapping[className] = `c-${hash}`;
  }
  return mapping;
}

// Fungsi untuk mengumpulkan semua class dari HTML dan CSS
function collectClasses(htmlContent, cssPaths) {
  const classes = new Set();

  // Ambil class dari HTML
  htmlContent.replace(/class="([^"]*)"/g, (_, classAttr) => {
    classAttr.split(/\s+/).forEach(c => c && classes.add(c));
  });

  // Ambil class dari CSS
  cssPaths.forEach(cssPath => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    cssContent.replace(/\.([a-zA-Z0-9_-]+)(?=[^{}]*{)/g, (_, className) => {
      classes.add(className);
    });
  });

  return Array.from(classes);
}

// Fungsi untuk memproses dan mengganti class di CSS
function processCSS(cssContent, mapping) {
  return cssContent.replace(/\.([a-zA-Z0-9_-]+)/g, (match, className) => {
    return mapping[className] ? `.${mapping[className]}` : match;
  });
}


// Fungsi untuk memproses HTML (Minify + Nonce + bfcache script)
function processHTML(inputFilePath, outputFilePath) {
    try {
        const cssFiles = ['style.css', 'css/all.min.css', 'css/all.css', 'css/brands.min.css', 'css/brands.css', 'css/fontawesome.min.css', 'css/fontawesome.css', 'css/regular.min.css', 'css/regular.css', 'css/solid.min.css', 'css/solid.css', 'css/svg-with-js.min.css', 'css/svg-with-js.css', 'css/v4-font-face.min.css', 'css/v4-font-face.css', 'css/v4-shims.css', 'css/v4-shims.min.css', 'css/v5-font-face.css', 'css/v5-font-face.min.css'].map(file => path.resolve(file));
        let htmlContent = fs.readFileSync(inputFilePath, 'utf8');
        
        // 1. Kumpulkan semua class
        const allClasses = collectClasses(htmlContent, cssFiles);
        
        // 2. Buat mapping hash
        const classMapping = generateClassMapping(allClasses);
        
        // 3. Ganti class di HTML
        htmlContent = htmlContent.replace(/class="([^"]*)"/g, (match, classAttr) => {
          const newClasses = classAttr.split(/\s+/).map(c => classMapping[c] || c).join(' ');
          return `class="${newClasses}"`;
        });
        
        // 4. Ganti class di CSS
        cssFiles.forEach(cssPath => {
          let cssContent = fs.readFileSync(cssPath, 'utf8');
          cssContent = processCSS(cssContent, classMapping);
          fs.writeFileSync(cssPath, cssContent);
        });

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
