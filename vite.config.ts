import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/**/*"],
      manifest: {
        name: "מערך הבקרה האווירית",
        short_name: "מערך הבקרה",
        description: "סימולטור משימה - הגן על שמי המדינה",
        lang: "he",
        dir: "rtl",
        theme_color: "#050D1A",
        background_color: "#050D1A",
        display: "fullscreen",
        orientation: "portrait",
        icons: [
          {
            src: "assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
