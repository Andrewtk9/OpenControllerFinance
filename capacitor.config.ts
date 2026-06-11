import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.opencontrollerfinance",
  appName: "OpenControllerFinance",
  webDir: "out",
  plugins: {
    // IMPORTANTE: enabled:false — o patch global de fetch quebra a navegação
    // interna do Next. As chamadas à Pluggy usam CapacitorHttp.get/post
    // diretamente (sempre nativas, sem CORS), sem precisar do patch.
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
