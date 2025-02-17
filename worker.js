export default {
  async fetch(request, env) {
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
    
    if (!url.pathname.startsWith('/')) {
      return new Response('Invalid request', { status: 400 });
    }

    const githubUrl = new URL(url.pathname, githubBaseUrl);
    const nonce = crypto.randomUUID();

    try {
      const sanitizedHeaders = new Headers();
      ['accept', 'accept-encoding', 'accept-language', 'user-agent'].forEach(header => {
        if (request.headers.has(header)) {
          sanitizedHeaders.set(header, request.headers.get(header));
        }
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(githubUrl.toString(), {
        headers: sanitizedHeaders,
        method: request.method,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      const contentType = response.headers.get('content-type');

      // Common security headers for all responses
      const baseSecurityHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin'
      };

      if (contentType?.includes('text/html')) {
        let html = await response.text();

        const securityHeaders = {
          ...baseSecurityHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'no-referrer',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
          'Content-Security-Policy': `
            default-src 'self';
            script-src 'self' unsafe-inline' 'nonce-${nonce}' ${githubBaseUrl};
            style-src 'self' unsafe-inline' ${githubBaseUrl};
            img-src 'self' data: ${githubBaseUrl};
            font-src 'self';
            connect-src 'self';
            frame-ancestors 'none';
            object-src 'none';
            form-action 'self';
            base-uri 'self';
            upgrade-insecure-requests;
          `.replace(/\s+/g, ' ').trim(),
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
        };

        html = '<!DOCTYPE html>\n' + html
          .replace(/<html lang=en xml:lang=en><head faceid="">/i, `<head>
            <meta charset="utf-8">
            <title>Mental Health</title>
            <link href=https://4211421036.github.io/MentalHealth/ rel=canonical>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="description" content="Mental Health support and resources">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="robots" content="noindex, nofollow">
            <link href=https://4211421036.github.io/g4lihru/987654567.png rel=preload type=image/x-icon as=image>
            <link href=https://4211421036.github.io/g4lihru/987654567.png rel="shortcut icon" type=image/x-icon>
            <link href=https://4211421036.github.io/g4lihru/987654567.png rel=icon type=image/x-icon>
            <link href=https://4211421036.github.io/MentalHealth/style.css rel=preload as=style>
            <link href=https://4211421036.github.io/MentalHealth/css/all.min.css rel=stylesheet media=all onload='"all"!==media&&(media="none")'>
            <link href=https://4211421036.github.io/MentalHealth/style.css rel=stylesheet media=all onload='"all"!==media&&(media="none")'>
            <link href=https://4211421036.github.io/MentalHealth/manifest.webmanifest rel=manifest>
            <link href=https://4211421036.github.io/g4lihru/987654567.png rel=apple-touch-icon>
            <meta content="A comprehensive mental health monitoring application using modern web technologies." name=description>
            <meta content="mental health, monitoring, health app, face analysis, emotion detection" name=keywords>
            <meta content="GALIH RIDHO UTOMO and Ana Maulida" name=author>
            <meta content=en http-equiv=Content-Language>
            <meta content="dark light" name=color-scheme>
            <meta content="Mental Health" property=og:title>
            <meta content="A comprehensive mental health monitoring application using modern web technologies." property=og:description>
            <meta content=https://4211421036.github.io/g4lihru/987654567.png property=og:image>
            <meta content=https://4211421036.github.io/MentalHealth property=og:url>
            <meta content=425 property=og:image:width>
            <meta content=425 property=og:image:height>
            <meta content=website property=og:type>
            <meta content="Light Dark" http-equiv=default-style>
            <meta content=en_US property=og:locale>
            
            `)
          .replace(/<script\b/g, `<script nonce="${nonce}"`)
          .replace(/<a\b/g, '<a rel="noopener noreferrer"')
          .replace(/on\w+="[^"]*"/g, '');

        return new Response(html, {
          headers: new Headers(securityHeaders),
          status: response.status,
          statusText: response.statusText
        });
      }

      // Handle non-HTML responses
      const headers = new Headers({
        ...baseSecurityHeaders,
        'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
      });

      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
      if (/^(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/.test(fileExtension)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        headers.set('Cache-Control', 'no-store, must-revalidate');
      }

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
