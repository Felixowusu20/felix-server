import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Live monitor: all routes are request-time (auth + DB). Cache Components
  // prerender validation fights that model and blocks the production build.
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
