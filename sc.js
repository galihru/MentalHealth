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

function generateHashMapping(items) {
  const mapping = {};
  for (const item of items) {
    const hash = crypto.createHash('sha1').update(item).digest('hex').substring(0, 8);
    mapping[item] = `c-${hash}`;
  }
  return mapping;
}

// Fungsi untuk mengumpulkan semua class dan ID dari HTML, CSS, dan JS
function collectClassesAndIds(htmlContent, cssPaths, jsPaths) {
  const classes = new Set();
  const ids = new Set();

  // Ambil class dan ID dari HTML
  htmlContent.replace(/class="([^"]*)"/g, (_, classAttr) => {
    classAttr.split(/\s+/).forEach(c => c && classes.add(c));
  });
  htmlContent.replace(/id="([^"]*)"/g, (_, idAttr) => {
    ids.add(idAttr);
  });

  // Ambil class dari CSS
  cssPaths.forEach(cssPath => {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    cssContent.replace(/\.([a-zA-Z0-9_-]+)(?=[^{}]*{)/g, (_, className) => {
      classes.add(className);
    });
    cssContent.replace(/#([a-zA-Z0-9_-]+)(?=[^{}]*{)/g, (_, idName) => {
      ids.add(idName);
    });
  });

  // Ambil class dan ID dari JS
  jsPaths.forEach(jsPath => {
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    jsContent.replace(/\.classList\.(add|remove|toggle|contains)\(["']([^"']+)["']\)/g, (_, method, className) => {
      classes.add(className);
    });
    jsContent.replace(/document\.(querySelector|getElementById)\(["']([^"']+)["']\)/g, (_, method, selector) => {
      if (method === 'getElementById') {
        ids.add(selector);
      } else if (selector.startsWith('.')) {
        classes.add(selector.slice(1));
      } else if (selector.startsWith('#')) {
        ids.add(selector.slice(1));
      }
    });
  });

  return { classes: Array.from(classes), ids: Array.from(ids) };
}

// Fungsi untuk memproses dan mengganti class dan ID di CSS
function processCSS(cssContent, classMapping, idMapping) {
  cssContent = cssContent.replace(/\.([a-zA-Z0-9_-]+)/g, (match, className) => {
    return classMapping[className] ? `.${classMapping[className]}` : match;
  });
  cssContent = cssContent.replace(/#([a-zA-Z0-9_-]+)/g, (match, idName) => {
    return idMapping[idName] ? `#${idMapping[idName]}` : match;
  });
  return cssContent;
}

// Fungsi untuk memproses dan mengganti class dan ID di JS
function processJS(jsContent, classMapping, idMapping) {
  jsContent = jsContent.replace(/\.classList\.(add|remove|toggle|contains)\(["']([^"']+)["']\)/g, (_, method, className) => {
    return `.classList.${method}("${classMapping[className] || className}")`;
  });
  jsContent = jsContent.replace(/document\.(querySelector|getElementById)\(["']([^"']+)["']\)/g, (_, method, selector) => {
    if (method === 'getElementById') {
      return `document.getElementById("${idMapping[selector] || selector}")`;
    } else if (selector.startsWith('.')) {
      return `document.querySelector(".${classMapping[selector.slice(1)] || selector.slice(1)}")`;
    } else if (selector.startsWith('#')) {
      return `document.querySelector("#${idMapping[selector.slice(1)] || selector.slice(1)}")`;
    }
    return match;
  });
  return jsContent;
}

// Fungsi untuk memproses HTML (Minify + Nonce + bfcache script)
function processHTML(inputFilePath, outputFilePath) {
    try {
        const cssFiles = ['style.css', 'css/all.min.css', 'css/all.css', 'css/brands.min.css', 'css/brands.css', 'css/fontawesome.min.css', 'css/fontawesome.css', 'css/regular.min.css', 'css/regular.css', 'css/solid.min.css', 'css/solid.css', 'css/svg-with-js.min.css', 'css/svg-with-js.css', 'css/v4-font-face.min.css', 'css/v4-font-face.css', 'css/v4-shims.css', 'css/v4-shims.min.css', 'css/v5-font-face.css', 'css/v5-font-face.min.css'].map(file => path.resolve(file));
        let htmlContent = fs.readFileSync(inputFilePath, 'utf8');
        
        // 1. Kumpulkan semua class dan ID
        const { classes, ids } = collectClassesAndIds(htmlContent, cssFiles, jsFiles);
        
        // 2. Buat mapping hash untuk class dan ID
        const classMapping = generateHashMapping(classes);
        const idMapping = generateHashMapping(ids);
        
        // 3. Ganti class dan ID di HTML
        htmlContent = htmlContent.replace(/class="([^"]*)"/g, (match, classAttr) => {
          const newClasses = classAttr.split(/\s+/).map(c => classMapping[c] || c).join(' ');
          return `class="${newClasses}"`;
        });
        htmlContent = htmlContent.replace(/id="([^"]*)"/g, (match, idAttr) => {
          return `id="${idMapping[idAttr] || idAttr}"`;
        });
        
        // 4. Ganti class dan ID di CSS
        cssFiles.forEach(cssPath => {
          let cssContent = fs.readFileSync(cssPath, 'utf8');
          cssContent = processCSS(cssContent, classMapping, idMapping);
          fs.writeFileSync(cssPath, cssContent);
        });

        // 5. Ganti class dan ID di JS
        jsFiles.forEach(jsPath => {
          let jsContent = fs.readFileSync(jsPath, 'utf8');
          jsContent = processJS(jsContent, classMapping, idMapping);
          fs.writeFileSync(jsPath, jsContent);
        });

        // 6. Proses inline JavaScript di HTML
        htmlContent = htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, scriptContent) => {
          return `<script>${processJS(scriptContent, classMapping, idMapping)}</script>`;
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
