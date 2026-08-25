/**
 * Cabeceras de seguridad aplicadas a todo el sitio.
 *
 * No había ninguna: el panel era embebible en un iframe de cualquier origen,
 * lo que permite clickjacking sobre acciones autenticadas.
 *
 * No se define Content-Security-Policy todavía: hacerlo bien exige inventariar
 * los orígenes que la aplicación usa (Supabase, Google Fonts, wa.me, Google
 * Maps) y una CSP mal armada rompe la página en silencio. Queda como paso
 * aparte, para poder probarla primero en modo `Report-Only`.
 */
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
