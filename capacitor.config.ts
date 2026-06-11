import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.opencontrollerfinance",
  appName: "OpenControllerFinance",
  webDir: "out",
  plugins: {
    // proxy nativo de HTTP: chamadas à API da Pluggy direto do celular, sem CORS
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
