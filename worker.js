// worker.js
export default {
  async fetch(request, env) {
    // Generate nonce for CSP
    const nonce = crypto.randomUUID();
    
    try {
      // Get the original response
      const response = await fetch(request);
      const contentType = response.headers.get('content-type');
      
      // Only process HTML responses
      if (contentType && contentType.includes('text/html')) {
        const originalText = await response.text();
        
        // Set security headers
        const headers = new Headers({
          'Content-Type': 'text/html',
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
            frame-src 'none';
            frame-ancestors 'none';
            form-action 'self';
            base-uri 'self';
            upgrade-insecure-requests;
          `.replace(/\s+/g, ' ').trim(),
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        });
        
        // Return modified response with security headers
        return new Response(originalText, {
          headers: headers,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      return response;
    } catch (err) {
      return new Response('Error processing request', { status: 500 });
    }
  }
}
