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

      if (contentType?.includes('text/html')) {
        let html = await response.text();

        // Enhanced security headers with stronger CSP
        const securityHeaders = {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
          'Content-Security-Policy': `
            default-src 'none';
            script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdnjs.cloudflare.com;
            style-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com;
            img-src 'self' data: https:;
            font-src 'self' https://cdnjs.cloudflare.com;
            connect-src 'self';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'none';
            object-src 'none';
            upgrade-insecure-requests;
            block-all-mixed-content;
            require-trusted-types-for 'script';
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'X-Permitted-Cross-Domain-Policies': 'none',
          'Report-To': '{"group":"default","max_age":31536000,"endpoints":[{"url":"https://4211421036.github.io/MentalHealth/report"}],"include_subdomains":true}',
          'NEL': '{"report_to":"default","max_age":31536000,"include_subdomains":true}'
        };

        // Enhanced HTML security
        html = '<!DOCTYPE html>\n' + html
          .replace(/<head>/i, `<head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="description" content="Mental Health support and resources">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'none'; report-uri https://4211421036.github.io/MentalHealth/report">
            <meta name="robots" content="noindex, nofollow">`)
          .replace(/<script\b/g, `<script nonce="${nonce}"`)
          .replace(/<style\b/g, `<style nonce="${nonce}"`)
          .replace(/<a\b/g, '<a rel="noopener noreferrer"')
          .replace(/on\w+="[^"]*"/g, '')
          .replace(/<iframe\b/g, '<iframe sandbox="allow-scripts" loading="lazy"');

        return new Response(html, {
          headers: new Headers(securityHeaders),
          status: response.status,
          statusText: response.statusText
        });
      }

      const headers = new Headers({
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
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
