import type { NextConfig } from "next";

// STATIC_EXPORT=1 → fully static build into ./out (used by GitHub Pages).
// NEXT_PUBLIC_BASE_PATH is the Pages sub-path (/tycoon-life) — set for both
// builds so client code can build correct absolute URLs.
const isStatic = process.env.STATIC_EXPORT === "1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? (isStatic ? "/tycoon-life" : "");

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  basePath: BASE || undefined,
  trailingSlash: isStatic,
  env: { NEXT_PUBLIC_BASE_PATH: BASE, NEXT_PUBLIC_HAS_BACKEND: isStatic ? "0" : "1" },
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  turbopack: { root: __dirname },
};

export default nextConfig;
