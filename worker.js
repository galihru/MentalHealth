export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const githubBaseUrl = 'https://4211421036.github.io/MentalHealth/';
    const githubUrl = new URL(url.pathname, githubBaseUrl);
    const nonce = crypto.randomUUID();
    const reportUri = 'https://4211421036.github.io/MentalHealth/security-report';

    try {
      // Fetch the original response
      const response = await fetch(githubUrl.toString(), {
        method: request.method,
        headers: request.headers
      });

      // Define strict security headers
      const securityHeaders = {
        // Strong CSP with nonce and strict directives
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://4211421036.github.io;
          style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://4211421036.github.io;
          img-src 'self' data: https:;
          font-src 'self' https://4211421036.github.io;
          connect-src 'self';
          frame-ancestors 'none';
          form-action 'self';
          base-uri 'self';
          object-src 'none';
          require-trusted-types-for 'script';
          upgrade-insecure-requests;
        `.replace(/\s+/g, ' ').trim(),

        // Strong HSTS policy with all recommended directives
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

        // Cross-Origin policies for proper isolation
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',

        // Additional security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()',
      };

      // Create new response with enhanced security headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          ...securityHeaders
        }
      });

    } catch (error) {
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
