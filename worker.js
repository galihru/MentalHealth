export default {
  async fetch(request, env) {
    // Validasi metode request
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Allow': 'GET, HEAD',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    const url = new URL(request.url);
    const githubBaseUrl = 'https://4211421036.github.io/MentalHealth/';
    
    // Pastikan path tidak dimanipulasi agar menghindari SSRF
    if (!url.pathname.startsWith('/')) {
      return new Response('Invalid request', { status: 400 });
    }

    const githubUrl = new URL(url.pathname, githubBaseUrl);
    const nonce = crypto.randomUUID();

    try {
      // Sanitize headers sebelum diteruskan
      const sanitizedHeaders = new Headers();
      ['accept', 'accept-encoding', 'accept-language', 'user-agent'].forEach(header => {
        if (request.headers.has(header)) {
          sanitizedHeaders.set(header, request.headers.get(header));
        }
      });

      // Fetch dari GitHub dengan timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(githubUrl.toString(), {
        headers: sanitizedHeaders,
        method: request.method,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      const contentType = response.headers.get('content-type');

      // Jika respons adalah HTML, tambahkan keamanan tambahan
      if (contentType?.includes('text/html')) {
        let html = await response.text();

        // Tambahkan header keamanan
        const securityHeaders = {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
          'Content-Security-Policy': `
            default-src 'self';
            script-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com ${githubBaseUrl};
            style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com ${githubBaseUrl};
            img-src 'self' data: ${githubBaseUrl};
            font-src 'self' https://cdnjs.cloudflare.com;
            connect-src 'self';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'self';
            upgrade-insecure-requests;
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
          'Access-Control-Allow-Origin': '*', // Bisa disesuaikan jika perlu lebih ketat
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin'
        };

        // Amankan HTML
        html = '<!DOCTYPE html>\n' + html
          .replace(/<head>/i, `<head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="description" content="Mental Health support and resources">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="robots" content="noindex, nofollow">`)
          .replace(/<script\b/g, `<script nonce="${nonce}"`)
          .replace(/<a\b/g, '<a rel="noopener noreferrer"')
          .replace(/on\w+="[^"]*"/g, ''); // Hapus event handler inline

        return new Response(html, {
          headers: new Headers(securityHeaders),
          status: response.status,
          statusText: response.statusText
        });
      }

      // Tangani respons non-HTML
      const headers = new Headers({
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });

      // Set cache header berdasarkan ekstensi file
      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
      if (/^(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/.test(fileExtension)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        headers.set('Cache-Control', 'no-store, must-revalidate');
      }

      // Salin header respons asli yang aman
      ['content-type', 'content-length', 'last-modified', 'etag'].forEach(header => {
        if (response.headers.has(header)) {
          headers.set(header, response.headers.get(header));
        }
      });

      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText
      });

    } catch (err) {
      console.error('Worker error:', err);
      let errorMessage = 'Service temporarily unavailable';
      let statusCode = 503;

      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out';
        statusCode = 504;
      } else if (err.name === 'TypeError') {
        errorMessage = 'Invalid request';
        statusCode = 400;
      }

      return new Response(errorMessage, { 
        status: statusCode,
        headers: {
          'Content-Type': 'text/plain',
          'X-Content-Type-Options': 'nosniff',
          'Retry-After': '300'
        }
      });
    }
  }
};
