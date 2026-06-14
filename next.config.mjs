/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "google-auth-library"],
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Next.js 14 bundled webpack doesn't handle the "node:" URI scheme used
      // by firebase-admin/google-auth-library dependencies. Replace them with
      // the plain module name that webpack already knows how to externalize.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
};

export default nextConfig;
