import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vibechord.app",
  appName: "Vibechord",
  webDir: "out",
  server: {
    androidScheme: "http",
    cleartext: true, 
  },
};

export default config;