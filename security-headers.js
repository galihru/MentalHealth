// Cloudflare Worker to inject security headers
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const response = await fetch(request);
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);
    
    // Set all security headers
    newResponse.headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'");
    
    newResponse.headers.set('Strict-Transport-Security', 
        "max-age=63072000; includeSubDomains; preload");
    
    newResponse.headers.set('X-Frame-Options', "DENY");
    newResponse.headers.set('Cross-Origin-Opener-Policy', "same-origin");
    newResponse.headers.set('X-Content-Type-Options', "nosniff");
    newResponse.headers.set('Referrer-Policy', "strict-origin-when-cross-origin");
    newResponse.headers.set('Permissions-Policy', 
        "geolocation=(), microphone=(), camera=(), payment=()");
    
    return newResponse;
}
