export default {
  async fetch(request, env) {
    // Validate request method
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
    const githubUrl = new URL(url.pathname, 'https://4211421036.github.io/MentalHealth/');
    
    const nonce = crypto.randomUUID();
    
    try {
      // Validate and sanitize headers before forwarding
      const sanitizedHeaders = new Headers();
      ['accept', 'accept-encoding', 'accept-language', 'user-agent'].forEach(header => {
        if (request.headers.has(header)) {
          sanitizedHeaders.set(header, request.headers.get(header));
        }
      });

      // Fetch from GitHub Pages with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(githubUrl.toString(), {
        headers: sanitizedHeaders,
        method: request.method,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));
      
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/html')) {
        let html = await response.text();
        
        // Security headers
        const securityHeaders = {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
          'Content-Security-Policy': `
            default-src 'none';
            script-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com https://4211421036.github.io/MentalHealth/;
            style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://4211421036.github.io/MentalHealth/;
            img-src 'self' data: https://api.placeholder.com https://4211421036.github.io/MentalHealth/;
            font-src 'self' https://cdnjs.cloudflare.com https://4211421036.github.io/MentalHealth/;
            connect-src 'self';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'none';
            upgrade-insecure-requests;
            block-all-mixed-content;
            require-trusted-types-for 'script';
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin'
        };

        // Essential HTML security fixes
        html = '<!DOCTYPE html>\n' + html
          .replace(/<head>/i, `<head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="description" content="Mental Health support and resources">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="robots" content="noindex, nofollow">`)
          .replace(/<script\b/g, `<script nonce="${nonce}"`)
          .replace(/<a\b/g, '<a rel="noopener noreferrer"')
          .replace(/on\w+="[^"]*"/g, ''); // Remove inline event handlers

        return new Response(html, {
          headers: new Headers(securityHeaders),
          status: response.status,
          statusText: response.statusText
        });
      }
      
      // Handle non-HTML responses
      const headers = new Headers({
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });

      // Set appropriate cache headers based on file type
      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
      if (/^(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/.test(fileExtension)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        headers.set('Cache-Control', 'no-store, must-revalidate');
      }

      // Copy original response headers that are safe
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
      return new Response('Service temporarily unavailable', { 
        status: 503,
        headers: {
          'Content-Type': 'text/plain',
          'X-Content-Type-Options': 'nosniff',
          'Retry-After': '300'
        }
      });
    }
  }
}
