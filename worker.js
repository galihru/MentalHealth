export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Redirect to GitHub Pages
    const githubUrl = new URL(url.pathname, 'https://4211421036.github.io/MentalHealth/');
    
    const nonce = crypto.randomUUID();
    
    try {
      // Fetch from GitHub Pages
      const response = await fetch(githubUrl.toString(), {
        headers: request.headers,
        method: request.method,
        body: request.body,
      });
      
      const contentType = response.headers.get('content-type');
      
      // Only process HTML responses
      if (contentType && contentType.includes('text/html')) {
        let html = await response.text();
        
        // Ensure proper DOCTYPE
        if (!html.includes('<!DOCTYPE html>')) {
          html = '<!DOCTYPE html>\n' + html;
        }
        
        // Ensure meta charset is in head
        if (!html.includes('<meta charset="utf-8"')) {
          html = html.replace('<head>', '<head>\n<meta charset="utf-8">');
        }
        
        // Ensure viewport meta is in head
        if (!html.includes('name="viewport"')) {
          html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
        }
        
        // Ensure meta description
        if (!html.includes('name="description"')) {
          html = html.replace('<head>', '<head>\n<meta name="description" content="Mental Health support and resources">');
        }
        
        // Set security headers
        const headers = new Headers({
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': `
            default-src 'self';
            script-src 'self' 'nonce-${nonce}' https://cdnjs.cloudflare.com;
            style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
            img-src 'self' data: https://api.placeholder.com;
            font-src 'self' https://cdnjs.cloudflare.com;
            connect-src 'self';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'self';
            upgrade-insecure-requests;
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
          // Cache Control headers
          'Cache-Control': 'public, max-age=31536000, immutable',
          // Remove Expires header as we're using Cache-Control
          'Access-Control-Allow-Origin': '*'
        });
        
        // Add nonce to all script tags
        html = html.replace(/<script\b/g, `<script nonce="${nonce}"`);
        
        // Fix vendor prefixes
        html = html
          .replace(/backdrop-filter:/g, '-webkit-backdrop-filter: $1;\nbackdrop-filter:')
          .replace(/background-clip:/g, '-webkit-background-clip: $1;\nbackground-clip:')
          .replace(/mask-image:/g, '-webkit-mask-image: $1;\nmask-image:')
          .replace(/mask-position:/g, '-webkit-mask-position: $1;\nmask-position:')
          .replace(/mask-repeat:/g, '-webkit-mask-repeat: $1;\nmask-repeat:')
          .replace(/user-select:/g, '-webkit-user-select: $1;\nuser-select:');
        
        return new Response(html, {
          headers: headers,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      // For non-HTML responses, set appropriate cache headers
      const headers = new Headers(response.headers);
      if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.delete('Expires'); // Remove Expires header
      } else {
        headers.set('Cache-Control', 'no-cache, must-revalidate');
      }
      headers.set('X-Content-Type-Options', 'nosniff');
      
      return new Response(response.body, {
        headers: headers,
        status: response.status,
        statusText: response.statusText
      });
      
    } catch (err) {
      return new Response('Error processing request', { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
  }
}
