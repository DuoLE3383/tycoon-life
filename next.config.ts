import type { NextConfig } from "next";

// STATIC_EXPORT=1 → fully static build into ./out (used by GitHub Pages).
// The site is deployed at the root of the custom domain https://huyenbao.com —
// assets must use "/" paths. NEXT_PUBLIC_BASE_PATH can still override the
// base for special builds (e.g. serving under a sub-path).
const isStatic = process.env.STATIC_EXPORT === "1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  basePath: BASE || undefined,
  trailingSlash: isStatic,
  pageExtensions: isStatic ? ["tsx"] : ["tsx", "ts"],
  env: { NEXT_PUBLIC_BASE_PATH: BASE, NEXT_PUBLIC_HAS_BACKEND: isStatic ? "0" : "1" },
  images: { unoptimized: true },
  reactStrictMode: false,
  turbopack: { root: __dirname },
};

export default nextConfig;
