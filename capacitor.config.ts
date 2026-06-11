import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.opencontrollerfinance",
  appName: "OpenControllerFinance",
  webDir: "mobile-shell",
  server: {
    // o app navega para o servidor local (http) na rede Wi-Fi
    cleartext: true,
    allowNavigation: ["10.*", "192.168.*", "172.16.*", "*.local", "*.vercel.app"],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
