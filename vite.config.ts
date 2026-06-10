import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      // No offline caching: a precaching service worker is exactly what pinned
      // mobile devices to stale builds. `selfDestroying` ships a service worker
      // whose only job is to unregister itself and delete every cache. After it
      // runs once on a device (replacing any old precache SW), there is no
      // service worker left, so every request goes to the network and the user
      // always gets the latest deploy. Hashed asset filenames + the no-cache
      // headers in netlify.toml keep the browser HTTP cache honest too.
      selfDestroying: true,
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
