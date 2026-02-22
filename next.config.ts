import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/weetzee",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
