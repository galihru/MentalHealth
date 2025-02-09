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
        const cssFiles = ['styles.css', 'css/all.min.css', 'css/all.css', 'css/brands.min.css', 'css/brands.css', 'css/fontawesome.min.css', 'css/fontawesome.css', 'css/regular.min.css', 'css/regular.css', 'css/solid.min.css', 'css/solid.css', 'css/svg-with-js.min.css', 'css/svg-with-js.css', 'css/v4-font-face.min.css', 'css/v4-font-face.css', 'v4-shims.css', 'v4-shims.min.css', 'v5-font-face.css', 'v5-font-face.min.css'].map(file => path.resolve(file));
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

        // 1. Pastikan atribut lang dan xml:lang ada dan valid
        htmlContent = htmlContent.replace(/<html\s*([^>]*)>/i, (match, attributes) => {
            // Hapus atribut lang/xml:lang yang ada
            let filteredAttrs = attributes
                .replace(/\s+(lang|xml:lang)=["'][^"']*["']/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            return `<html ${filteredAttrs} lang="en" xml:lang="en">`;
        });

        // 2. Pastikan tag <video> memiliki <track kind="captions">
        htmlContent = htmlContent.replace(/<video\b([^>]*)>([\s\S]*?)<\/video>/gi, (match, videoAttrs, innerContent) => {
            // Jika tidak ada <track kind="captions">, tambahkan
            if (!/<track\s[^>]*kind=["']captions["']/gi.test(innerContent)) {
                innerContent += `<track kind="captions" src="https://4211421036.github.io/MentalHealth/en.vtt" srclang="en" label="English">`;
            }
            return `<video${videoAttrs}>${innerContent}</video>`;
        });

        // 3. Pastikan elemen dengan role="dialog" atau role="alertdialog" memiliki accessible name
        htmlContent = htmlContent.replace(/<div\b([^>]*)\bclass=["']modal["']([^>]*)>/gi, (match, attrs1, attrs2) => {
            // Gabungkan semua atribut
            let allAttrs = `${attrs1} ${attrs2}`.trim();

            // Periksa apakah role="dialog" atau role="alertdialog" ada
            if (/role=["'](dialog|alertdialog)["']/gi.test(allAttrs)) {
                // Periksa apakah sudah ada aria-labelledby atau aria-label
                if (!/(aria-labelledby|aria-label)=["'][^"']*["']/gi.test(allAttrs)) {
                    // Tambahkan aria-labelledby dengan ID default jika tidak ada
                    allAttrs += ` aria-labelledby="modal-title"`;
                }
            }

            return `<div class="modal" ${allAttrs}>`;
        });

        // 4. Perbaiki hubungan parent-child ARIA roles
        // Contoh: role="menu" harus memiliki child dengan role="menuitem"
        htmlContent = htmlContent.replace(/<ul\b([^>]*)\brole=["']menu["']([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs1, attrs2, innerContent) => {
            // Periksa apakah ada child dengan role="menuitem"
            if (!/<li\b[^>]*\brole=["']menuitem["']/gi.test(innerContent)) {
                innerContent = innerContent.replace(/<li\b([^>]*)>/gi, `<li$1 role="menuitem">`);
            }
            return `<ul${attrs1} role="menu"${attrs2}>${innerContent}</ul>`;
        });

        // 5. ARIA meter accessible name
        htmlContent = htmlContent.replace(/<([^\s>]+)\b([^>]*)\brole=["']meter["']([^>]*)>/gi, (match, tagName, attrs1, attrs2) => {
            const allAttrs = `${attrs1} ${attrs2}`.trim();
            // Cek apakah sudah ada aria-label atau aria-labelledby
            if (!/(aria-label|aria-labelledby)=["']/.test(allAttrs)) {
                return `<${tagName}${attrs1} role="meter" aria-label="progress-bar" aria-labelledby="progress-bar"${attrs2}>`;
            }
            return match;
        });

         // 6. Perbaiki duplikat ARIA IDs
        const idMap = new Map(); // Untuk menyimpan mapping ID lama ke ID baru
        let idCounter = 1;

        // Cari semua ID yang ada di dokumen
        const allIds = new Set([...htmlContent.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]));

        // Periksa duplikat dan buat ID baru jika diperlukan
        htmlContent = htmlContent.replace(/\bid=["']([^"']+)["']/gi, (match, idValue) => {
            if (allIds.has(idValue)) {
                allIds.delete(idValue); // Hapus ID dari set setelah pertama kali ditemukan
                return match; // Pertahankan ID pertama
            } else {
                // Buat ID baru yang unik
                const newId = `${idValue}-${idCounter++}`;
                idMap.set(idValue, newId);
                return `id="${newId}"`;
            }
        });

        // Perbarui referensi ARIA yang menggunakan ID yang diubah
        idMap.forEach((newId, oldId) => {
            htmlContent = htmlContent.replace(new RegExp(`(aria-labelledby|aria-describedby)=["'](.*?)\\b${oldId}\\b(.*?)["']`, 'gi'), (match, attr, before, after) => {
                return `${attr}="${before}${newId}${after}"`;
            });
        });

        // Contoh: role="tablist" harus memiliki child dengan role="tab"
        htmlContent = htmlContent.replace(/<div\b([^>]*)\brole=["']tablist["']([^>]*)>([\s\S]*?)<\/div>/gi, (match, attrs1, attrs2, innerContent) => {
            // Periksa apakah ada child dengan role="tab"
            if (!/<div\b[^>]*\brole=["']tab["']/gi.test(innerContent)) {
                innerContent = innerContent.replace(/<div\b([^>]*)>/gi, `<div$1 role="tab">`);
            }
            return `<div${attrs1} role="tablist"${attrs2}>${innerContent}</div>`;
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
