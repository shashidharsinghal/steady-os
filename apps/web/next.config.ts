import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stride-os/ui", "@stride-os/shared"],
};

export default nextConfig;
