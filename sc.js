import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { minify } from 'html-minifier';

// Fungsi untuk menghasilkan nonce acak
function generateNonce() {
    return crypto.randomBytes(16).toString('base64');
}

// Fungsi untuk meminifikasi HTML dan menambahkan nonce ke <script>
function processHTML(inputFilePath, outputFilePath) {
    try {
        // Baca file HTML
        let htmlContent = fs.readFileSync(inputFilePath, 'utf8');

        // Tambahkan nonce ke semua tag <script>
        const nonce = generateNonce();
        htmlContent = htmlContent.replace(/<script(.*?)>/g, `<script$1 nonce="${nonce}">`);

        // Minifikasi HTML
        const minifiedHTML = minify(htmlContent, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            minifyJS: true,
            minifyCSS: true
        });

        // Simpan output ke file baru
        fs.writeFileSync(outputFilePath, minifiedHTML, 'utf8');

        console.log(`Minifikasi selesai. Hasil disimpan di: ${outputFilePath}`);
    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    }
}

// Contoh penggunaan
const inputPath = path.resolve('index.html');  // Ubah sesuai dengan lokasi file input
const outputPath = path.resolve('index.html'); // Lokasi file output

processHTML(inputPath, outputPath);
