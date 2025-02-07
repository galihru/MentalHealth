import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify } from 'html-minifier';

function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function generateHashedFileName(filePath) {
  const hash = crypto.createHash('sha256');
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  const fileHash = hash.digest('hex').slice(0, 8);
  const extname = path.extname(filePath);
  const newFileName = `${fileHash}${extname}`;
  const newFilePath = path.join(process.cwd(), newFileName);

  if (!fs.existsSync(newFilePath)) {
    fs.copyFileSync(filePath, newFilePath);
  }
  return newFileName;
}

function generateIntegrityHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384');
  hash.update(fileBuffer);
  return hash.digest('base64');
}

function generateInlineScriptHash(scriptContent) {
  const hash = crypto.createHash('sha256');
  hash.update(scriptContent);
  return `'sha256-${hash.digest('base64')}'`;
}

async function generateHtml() {
  // Generate nonce untuk setiap elemen
  const nonce = generateNonce();
  const cspContent = [
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://4211421036.github.io http://4211421036.github.io`,
      "object-src 'none'",
      "base-uri 'self'",
      "img-src 'self' data: https://4211421036.github.io http://4211421036.github.io",
      "default-src 'self' https://4211421036.github.io http://4211421036.github.io",
      `script-src 'self' 'unsafe-inline' 'strict-dynamic' https://4211421036.github.io http://4211421036.github.io; https://cdn.jsdelivr.net;`,
      "font-src 'self' https://4211421036.github.io http://4211421036.github.io",
      "media-src 'self' https://4211421036.github.io http://4211421036.github.io",
      "connect-src 'self' https://4211421036.github.io http://4211421036.github.io",
      "form-action 'self'",
      "manifest-src 'self' https://4211421036.github.io http://4211421036.github.io",
      "worker-src 'self' blob: https://4211421036.github.io http://4211421036.github.io"
  ].join('; ');

 const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Mental Health Face Recognition",
      "url": "https://4211421036.github.io/MentalHealth/",
      "description": "A mental health website using face recognition technology to provide personalized support.",
      "author": [
          {
              "@type": "Person",
              "name": "GALIH RIDHO UTOMO"
          },
          {
              "@type": "Person",
              "name": "Ana Maulida"
          }
      ],
      "publisher": {
          "@type": "Organization",
          "name": "FMIPA UNNES"
      }
  };

  const structuredDataJS = {
      "function toggleTheme(){const e=document.body,t=document.querySelector('.theme-toggle i');e.classList.toggle('dark-theme'),e.classList.contains('dark-theme')?(t.className='fas fa-sun',localStorage.setItem('theme','dark')):(t.className='fas fa-moon',localStorage.setItem('theme','light'))}document.addEventListener('DOMContentLoaded',(()=>{const e=localStorage.getItem('theme'),t=window.matchMedia('(prefers-color-scheme: dark)').matches,a=document.querySelector('.theme-toggle i');e?document.body.classList.toggle('dark-theme','dark'===e):document.body.classList.toggle('dark-theme',t),document.body.classList.contains('dark-theme')?a.className='fas fa-sun':a.className='fas fa-moon'}));",
  };

  let htmlContent = `<!DOCTYPE html>
  <html xml:lang="en" lang="en">
    <head FaceID="">
      meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mental Health</title>
    <meta name="description"
        content="A comprehensive mental health monitoring application using modern web technologies.">
    <meta name="keywords" content="mental health, monitoring, health app, face analysis, emotion detection">
    <meta name="author" content="GALIH RIDHO UTOMO and Ana Maulida">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://4211421036.github.io/MentalHealth/">
    <link rel="icon" href="https://4211421036.github.io/g4lihru/987654567.png" type="image/x-icon">
    <link href="https://4211421036.github.io/MentalHealth/css/all.min.css" rel="stylesheet" media="none"
        onload="if(media!=='all')media='all'" nonce="${nonce}">
    <link rel="stylesheet" href="https://4211421036.github.io/MentalHealth/styles.css" media="none"
        onload="if(media!=='all')media='all'" nonce="${nonce}">
    <script src="https://cdn.jsdelivr.net/npm/chart.js" nonce="${nonce}" crossorigin="anonymous" defer></script>
    <meta property="og:title" content="Mental Health">
    <meta property="og:description"
        content="A comprehensive mental health monitoring application using modern web technologies.">
    <meta property="og:image" content="https://4211421036.github.io/g4lihru/987654567.png">
    <meta property="og:url" content="https://4211421036.github.io/MentalHealth">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Mental Health">
    <meta name="twitter:description"
        content="A comprehensive mental health monitoring application using modern web technologies.">
    <meta name="twitter:image" content="https://4211421036.github.io/g4lihru/987654567.png">
    <link rel="manifest" href="manifest.webmanifest">
      <meta http-equiv="Content-Security-Policy" content="${cspContent}">
      <title>Selamat Ulang Tahun!</title>
      <script type="application/ld+json" nonce="${nonce}">
        ${JSON.stringify(structuredData, null, 2)}
      </script>
  `;

  // Menambahkan style inline dengan nonce
  htmlContent += `
    </head>
    <body>
    <div id="skeleton-container">
        <header class="skeleton-header skeleton-item">
            <div class="skeleton-headco">
                <div class="skeleton-logo"></div>
                <div class="skeleton-device"></div>
            </div>
            <div class="skeleton-controls">
                <div class="skeleton-control-item"></div>
                <div class="skeleton-control-item"></div>
            </div>
        </header>
        <div class="skeleton-container skeleton-item"></div>
        <nav class="skeleton-bottom-nav skeleton-item">
            <div class="skeleton-nav-item active">
            </div>
            <div class="skeleton-nav-item">
            </div>
            <div class="skeleton-nav-item">
            </div>
        </nav>
    </div>
    <header aria-label="Main Header">
        <div class="headco">
            <h1 class="logos">Mental Health</h1>
            <device class="device" state="connected/failed/not found" role="button" aria-label="device" accesskey="c">
                <p role="text">
                    Nama Device
                </p>
            </device>
        </div>
        <div class="controled">
            <div class="notif" data-page="notifikasi">
                <i class="fas fa-bell notification-icon" role="tooltip" title="Notifications"></i>
            </div>
            <button role="button" tabindex="-1" type="button" name="theme" class="theme-toggle" onclick="toggleTheme()"
                title="Toggle Theme" aria-label="theme-toggle">
                <i class="fas fa-moon" role="tooltip" title="Theme"></i>
            </button>
        </div>
    </header>
    <div class="container" role="main" aria-label="Main Content">
        <video id="video" autoplay>
            <track kind="captions" srclang="en" label="english_captions">
        </video>
        <canvas id="canvas"></canvas>
    </div>

    <nav class="bottom-nav" role="navigation" aria-label="Main Navigation">
        <div class="nav-item active" data-page="home" role="button" tabindex="0" accesskey="b">
            <i class="fas fa-home"></i>
            <span role="tooltip">Beranda</span>
        </div>
        <div class="nav-item" data-page="graph" role="button" tabindex="0" accesskey="g">
            <i class="fas fa-chart-line"></i>
            <span role="tooltip">Grafik</span>
        </div>
        <div class="nav-item" data-page="history" role="button" tabindex="0" accesskey="h">
            <i class="fas fa-history"></i>
            <span role="tooltip">Histori</span>
        </div>
    </nav>

    <div class="modal" id="notifikasiModal" role="dialog" aria-labelledby="notifikasiModalTitle">
        <div class="modal-content">
            <div class="swipe-indicator"></div>
            <div class="modal-header">
                <h2 class="modal-title" id="notifikasiModalTitle">Notifikasi</h2>
                <button class="close-btn" type="button" role="button" accesskey="x"
                    aria-label="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="nothing">
                    <svg width="1028" height="1089" viewBox="0 0 1028 1089" fill="none"
                        xmlns="http://www.w3.org/2000/svg" alt="Notif">
                        <path
                            d="M631 112C676.6 121.6 730 154.333 751 169.5C851.8 223.5 889.333 366.667 895.5 431.5C898.333 499.333 905.1 641.9 909.5 669.5C915 704 927 748.5 954.5 799C982 849.5 997.5 839.5 1014.5 864.5C1031.5 889.5 1028.5 898 1022.5 928.5C1017.7 952.9 986.167 967.333 971 971.5H653.5C653.333 971.167 651.2 976.9 644 1002.5C636.8 1028.1 600.667 1058.5 583.5 1070.5C572.5 1077.17 540.8 1090.1 502 1088.5C453.5 1086.5 427.5 1060.5 405 1040C387 1023.6 375.833 986.833 372.5 970.5C278.333 970.667 82.9 970.9 54.5 970.5C19 970 4 930.5 1 909.5C-2 888.5 7 875.5 15.5 862.5C24 849.5 31 859 68 808.5C97.6 768.1 114.333 700.667 119 672C121.667 645.5 127.5 568 129.5 470C131.5 372 164.333 301.167 180.5 278C200.833 243.5 262 166 344 132C363.396 123.958 381.002 117.688 397 112.804C400 79.1088 408 60 431.5 34C455 8 485.5 0.5 515.5 0.5C545.5 0.5 563 7 596 34C622.4 55.6 630.333 95 631 112Z"
                            fill="#3C424E" />
                        <ellipse cx="865.5" cy="275" rx="156.5" ry="155" fill="#3C424E" />
                        <rect x="786.419" y="331.973" width="192.421" height="30.514" rx="15.257"
                            transform="rotate(-45 786.419 331.973)" fill="white" />
                        <rect width="192.421" height="30.514" rx="15.257"
                            transform="matrix(-0.707107 -0.707107 -0.707107 0.707107 943.639 332.062)" fill="white" />
                        <path
                            d="M505 96C478.6 95.6 450.667 100.167 440 102.5C446 63.5 478 37 529 43.5C569.8 48.7 584.667 84.6667 587 102C580 100.667 563.3 97.8 552.5 97C539 96 538 96.5 505 96Z"
                            fill="white" />
                        <path
                            d="M501.782 975.536C466.941 976.123 430.077 969.423 416 966C423.918 1023.22 466.15 1062.1 533.456 1052.56C587.301 1044.93 606.921 992.164 610 966.734C600.762 968.69 578.722 972.896 564.469 974.069C546.653 975.536 545.333 974.803 501.782 975.536Z"
                            fill="white" />
                    </svg>
                    <h2>Tidak ada notifikasi</h2>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" id="deviceModal" role="dialog" aria-labelledby="deviceModalTitle">
        <div class="modal-content">
            <div class="swipe-indicator"></div>
            <div class="modal-header">
                <h2 class="modal-title">Device</h2>
                <button class="close-btn" role="button" type="button" aria-label="close-btn"
                    accesskey="x">&times;</button>
            </div>
            <div class="modal-body" id="modalBody">

            </div>
        </div>
    </div>

    <div class="modal" id="historyModal" role="dialog" aria-labelledby="historyModalTitle">
        <div class="modal-content">
            <div class="swipe-indicator"></div>
            <div class="modal-header">
                <h2 class="modal-title">Histori Pemantauan</h2>
                <button class="close-btn" role="button" type="button" aria-label="close-btn"
                    accesskey="x">&times;</button>
            </div>
            <div class="modal-body">
                <div class="hr">
                    <h1>Realtime Sensor</h1>
                    <i class="fa-solid fa-circle-info" data-modal="sensor"></i>
                </div>
                <div class="cards-container">
                    <div class="metric-card green">
                        <div class="metric-label">Heart Rate</div>
                        <div class="metric-value">95</div>
                        <div class="metric-label">bpm</div>
                    </div>
                    <div class="metric-card orange">
                        <div class="metric-label">Blood Pressure</div>
                        <div class="metric-value">121/80</div>
                        <div class="metric-label">mmHg</div>
                    </div>
                    <div class="metric-card purple">
                        <div class="metric-label">Sleep</div>
                        <div class="metric-value">6.8</div>
                        <div class="metric-label">hr/day</div>
                    </div>
                </div>
                <div class="hr">
                    <h1>Matric Emosional</h1>
                    <i class="fa-solid fa-circle-info" data-modal="emosional"></i>
                </div>
                <div class="cards-container">
                    <div class="metric-card green">
                        <div class="metric-label">Happy</div>
                        <div class="metric-value" id="happy">-</div>
                        <div class="metric-label">%</div>
                    </div>
                    <div class="metric-card orange">
                        <div class="metric-label">Sad</div>
                        <div class="metric-value" id="sad">-</div>
                        <div class="metric-label">%</div>
                    </div>
                    <div class="metric-card purple">
                        <div class="metric-label">Angry</div>
                        <div class="metric-value" id="angry">-</div>
                        <div class="metric-label">%</div>
                    </div>
                    <div class="metric-card blue">
                        <div class="metric-label">Neutral</div>
                        <div class="metric-value" id="neutral">-</div>
                        <div class="metric-label">%</div>
                    </div>
                    <div class="metric-card red">
                        <div class="metric-label">Surprised</div>
                        <div class="metric-value" id="surprised">-</div>
                        <div class="metric-label">%</div>
                    </div>
                </div>
                <h1>Kesimpulan untuk Anda</h1>
                <div class="conclusion-box">
                    <p id="conclusion">Menunggu data...</p>
                </div>
                <h2>Saran untuk Anda</h2>
                <div class="advice-box">
                    <p id="advice">Menunggu data...</p>
                </div>
            </div>
        </div>
    </div>

    <div class="modal" id="graphModal" role="dialog" aria-labelledby="graphModalTitle">
        <div class="modal-content">
            <div class="swipe-indicator"></div>
            <div class="modal-header">
                <h2 class="modal-title">Grafik Pemantauan</h2>
                <button class="close-btn" role="button" type="button" aria-label="close-btn"
                    accesskey="x">&times;</button>
            </div>
            <div class="modal-body">
                <div class="graph-card">
                    <div class="hr">
                        <div class="graph-title">Heart Rate Trend</div>
                        <i class="fa-solid fa-circle-info" data-modal="heartrate"></i>
                    </div>
                    <div class="chart-container">
                        <canvas id="heartRateChart"></canvas>
                    </div>
                    <div class="time-range">
                        <button type="button" class="time-btn" accesskey="d" aria-label="time-btn">1D</button>
                        <button type="button" class="time-btn active" accesskey="w" aria-label="time-btn">1W</button>
                        <button type="button" class="time-btn" accesskey="m" aria-label="time-btn">1M</button>
                        <button type="button" class="time-btn" accesskey="y" aria-label="time-btn">1Y</button>
                    </div>
                </div>

                <div class="graph-card">
                    <div class="hr">
                        <div class="graph-title">Blood Pressure Trend</div>
                        <i class="fa-solid fa-circle-info" data-modal="blood"></i>
                    </div>
                    <div class="chart-container">
                        <canvas id="bpChart"></canvas>
                    </div>
                    <div class="time-range">
                        <button class="time-btn" type="button" accesskey="d" aria-label="d">1D</button>
                        <button type="button" class="time-btn active" accesskey="w" aria-label="time-btn">1W</button>
                        <button class="time-btn" type="button" accesskey="m" aria-label="m">1M</button>
                        <button class="time-btn" type="button" accesskey="y" aria-label="y">1Y</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" nonce="${nonce}"  crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" nonce="${nonce}" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" nonce="${nonce}" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" nonce="${nonce}" crossorigin="anonymous"></script>
    <script nonce="${nonce">${structuredDataJS}
    </script>
    <script nonce="${nonce}">function toggleTheme(){const e=document.body,t=document.querySelector(".theme-toggle i");e.classList.toggle("dark-theme"),e.classList.contains("dark-theme")?(t.className="fas fa-sun",localStorage.setItem("theme","dark")):(t.className="fas fa-moon",localStorage.setItem("theme","light"))}document.addEventListener("DOMContentLoaded",(()=>{const e=localStorage.getItem("theme"),t=window.matchMedia("(prefers-color-scheme: dark)").matches,a=document.querySelector(".theme-toggle i");e?document.body.classList.toggle("dark-theme","dark"===e):document.body.classList.toggle("dark-theme",t),document.body.classList.contains("dark-theme")?a.className="fas fa-sun":a.className="fas fa-moon"}));</script>
      <script nonce="${nonce}">
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/MentalHealth/sw.js')
            .then(reg => console.log('Service worker registered'))
            .catch(err => console.log('Service worker not registered', err));
        }
        console.log('Generated automatic on: ${new Date().toLocaleString()}');
      </script>
      <!-- page generated automatic by: ${new Date().toLocaleString()} -->
    </body>
  </html>`;

  try {
    // Minify HTML yang dihasilkan
    const minifiedHtml = await minify(htmlContent, {
      collapseWhitespace: true,  // Menghapus spasi dan baris kosong
      removeComments: true,      // Menghapus komentar
      removeRedundantAttributes: true, // Menghapus atribut yang tidak perlu
      useShortDoctype: true,     // Menggunakan doctype singkat
      minifyJS: true,            // Minify JS
      minifyCSS: true            // Minify CSS
    });

    // Tentukan path untuk file HTML yang akan dihasilkan
    const outputPath = path.join(process.cwd(), 'index.html');

    // Simpan HTML yang telah di-minify ke file
    fs.writeFileSync(outputPath, minifiedHtml);
    console.log('File HTML telah dibuat dan di-minify di:', outputPath);
  } catch (error) {
    console.error('Error during minification:', error);
  }
}

generateHtml();
