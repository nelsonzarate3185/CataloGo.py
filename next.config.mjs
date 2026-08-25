/**
 * Cabeceras de seguridad aplicadas a todo el sitio.
 *
 * No había ninguna: el panel era embebible en un iframe de cualquier origen,
 * lo que permite clickjacking sobre acciones autenticadas.
 *
 * La CSP va en modo `Report-Only` a propósito: no bloquea nada, sólo registra
 * lo que habría bloqueado. Una CSP mal armada rompe la página en silencio, y
 * `unsafe-inline` en scripts está ahí porque Next inyecta scripts en línea para
 * la hidratación; quitarlo exige nonces por request.
 *
 * Para pasarla a modo bloqueo: revisar los informes en la consola del
 * navegador durante unos días, ajustar los orígenes que falten y recién ahí
 * cambiar la cabecera a `Content-Security-Policy`.
 */
const csp = [
  "default-src 'self'",
  // Next inyecta scripts en línea para hidratar; sin nonces por request no se
  // puede evitar 'unsafe-inline'.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind y next/font generan estilos en línea.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // blob: y data: son las vistas previas de imagen antes de subirlas.
  "img-src 'self' data: blob: https://*.supabase.co",
  // La API de Supabase y su canal de tiempo real.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
const securityHeaders = [
  // Impide que el panel se cargue dentro de un iframe ajeno.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Evita que el navegador adivine el tipo de contenido de una respuesta.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtra la URL completa a sitios externos; con los enlaces de catálogo
  // eso incluiría el slug del comercio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Fuerza HTTPS en visitas posteriores.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // La aplicación no usa cámara, micrófono ni ubicación.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Sólo informa: no bloquea nada hasta que se cambie el nombre de la cabecera.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
