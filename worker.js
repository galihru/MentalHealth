export default {
  async fetch(request, env) {
    try {
      // Get original response
      const url = new URL(request.url);
      const response = await fetch(`https://4211421036.github.io/MentalHealth${url.pathname}`);
      const newHeaders = new Headers(response.headers);

      // Define strict security headers
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://4211421036.github.io; style-src 'self' 'unsafe-inline' https://4211421036.github.io; img-src 'self' data: https:; font-src 'self' https://4211421036.github.io; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests;",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      };

      // Add security headers to response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      // Return modified response with security headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (err) {
      return new Response('Error processing request', { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          ...securityHeaders
        }
      });
    }
  }
};
