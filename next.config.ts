import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app 100% no celular: export estático embarcado no APK
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
