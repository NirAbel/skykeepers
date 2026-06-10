import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/**/*"],
      // Don't precache the build (that's what served stale versions on mobile).
      // Instead always go to the network for the latest deploy, and only fall
      // back to the cache when offline. The new SW also cleans up the old
      // precache caches and claims open clients immediately, so existing
      // installs self-heal on their next online load.
      workbox: {
        globPatterns: [],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: () => true,
            handler: "NetworkFirst",
            options: {
              cacheName: "sky-runtime",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
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
