import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app 100% no celular: export estático embarcado no APK
  output: "export",
  // gera /config/index.html etc — navegação dura no WebView resolve o arquivo
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
