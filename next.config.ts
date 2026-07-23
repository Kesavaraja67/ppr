import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      // Allow Vercel Blob images if used later
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      // Allow data: URLs for AI-generated images during development
      // (In production, images should be uploaded to Blob storage)
    ],
    // Allow local paths — curated images are in /public/curated/
    localPatterns: [
      { pathname: "/curated/**" },
      { pathname: "/icons/**" },
      { pathname: "/hero.jpg" },
      { pathname: "/logo.png" },
    ],
  },
  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Service worker must be served without cache headers
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
