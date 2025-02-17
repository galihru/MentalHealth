export default {
  async fetch(request, env) {
    // Validate request method with strict CORS
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Allow': 'GET, HEAD',
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Methods': 'GET, HEAD',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const url = new URL(request.url);
    const githubBaseUrl = 'https://4211421036.github.io/MentalHealth/';
    
    // Strict path validation
    if (!url.pathname.startsWith('/') || url.pathname.includes('..')) {
      return new Response('Invalid request', { status: 400 });
    }

    const githubUrl = new URL(url.pathname, githubBaseUrl);
    const nonce = crypto.randomUUID();
    const reportUri = 'https://4211421036.github.io/MentalHealth/security-report';

    try {
      // Enhanced header sanitization
      const sanitizedHeaders = new Headers();
      const allowedHeaders = ['accept', 'accept-encoding', 'accept-language', 'user-agent'];
      allowedHeaders.forEach(header => {
        if (request.headers.has(header)) {
          const value = request.headers.get(header);
          if (value && value.length < 1024) { // Prevent header injection
            sanitizedHeaders.set(header, value);
          }
        }
      });

      // Strict timeout control
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(githubUrl.toString(), {
        headers: sanitizedHeaders,
        method: request.method,
        signal: controller.signal,
        redirect: 'follow',
        credentials: 'same-origin'
      }).finally(() => clearTimeout(timeout));

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/html')) {
        let html = await response.text();

        // Ultra-strict security headers
        const securityHeaders = {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
          'Content-Security-Policy': `
            default-src 'none';
            script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' https: http:;
            style-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com;
            img-src 'self' data: https: http:;
            font-src 'self' https://cdnjs.cloudflare.com;
            connect-src 'self';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'none';
            object-src 'none';
            manifest-src 'self';
            media-src 'none';
            worker-src 'none';
            upgrade-insecure-requests;
            block-all-mixed-content;
            require-trusted-types-for 'script';
            trusted-types 'none';
            sandbox allow-scripts allow-same-origin allow-forms;
            report-uri ${reportUri};
            report-to default
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          'Cache-Control': 'public, max-age=86400, must-revalidate',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'X-Permitted-Cross-Domain-Policies': 'none',
          'Report-To': `{"group":"default","max_age":31536000,"endpoints":[{"url":"${reportUri}"}],"include_subdomains":true}`,
          'NEL': '{"report_to":"default","max_age":31536000,"include_subdomains":true}',
          'Feature-Policy': "camera 'none'; microphone 'none'; geolocation 'none'",
          'X-Download-Options': 'noopen',
          'X-DNS-Prefetch-Control': 'off',
          'Clear-Site-Data': '"cache","cookies","storage"'
        };

        // Enhanced HTML security measures
        html = '<!DOCTYPE html>\n' + html
          .replace(/<head>/i, `<head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="description" content="Mental Health support and resources">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'none'; report-uri ${reportUri}">
            <meta name="referrer" content="strict-origin-when-cross-origin">
            <meta name="robots" content="noindex, nofollow">
            <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
            <meta http-equiv="Pragma" content="no-cache">
            <meta http-equiv="Expires" content="0">`)
          .replace(/<script\b/g, `<script nonce="${nonce}"`)
          .replace(/<style\b/g, `<style nonce="${nonce}"`)
          .replace(/<link\b/g, `<link nonce="${nonce}"`)
          .replace(/<a\b/g, '<a rel="noopener noreferrer"')
          .replace(/on\w+="[^"]*"/g, '')
          .replace(/<iframe\b/g, '<iframe sandbox="allow-scripts allow-same-origin" loading="lazy"')
          .replace(/<form\b/g, '<form onsubmit="return false;"')
          .replace(/<input\b/g, '<input autocomplete="off"');

        return new Response(html, {
          headers: new Headers(securityHeaders),
          status: response.status,
          statusText: response.statusText
        });
      }

      // Enhanced security headers for non-HTML responses
      const headers = new Headers({
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Permissions-Policy': 'interest-cohort=()',
        'Clear-Site-Data': '"cache","cookies","storage"',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      });

      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();
      if (/^(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/.test(fileExtension)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
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
          'Retry-After': '300',
          'Cache-Control': 'no-store',
          'Clear-Site-Data': '"cache","cookies","storage"'
        }
      });
    }
  }
};
