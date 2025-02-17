const helmet = require('helmet');
const express = require('express');
const app = express();

// Gunakan helmet untuk keamanan
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  })
);
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(helmet.crossOriginOpenerPolicy({ policy: "same-origin" }));
app.use(helmet.referrerPolicy({ policy: "strict-origin-when-cross-origin" }));
app.use(helmet.crossOriginResourcePolicy({ policy: "same-origin" }));

// Fungsi yang akan dijalankan setiap 1 detik
function runScript() {
  console.log('File JS dijalankan pada:', new Date().toLocaleTimeString());
  // Tambahkan kode yang ingin dijalankan di sini
}

// Jalankan fungsi setiap 1 detik
setInterval(runScript, 1000);

// Jalankan server Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
