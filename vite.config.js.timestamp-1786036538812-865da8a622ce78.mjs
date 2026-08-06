// vite.config.js
import { defineConfig } from "file:///D:/Chrome%20Extension/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/node_modules/vite/dist/node/index.js";
import { crx } from "file:///D:/Chrome%20Extension/%D0%92%D1%80%D0%B5%D0%BC%D1%8F%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D0%BD.%20Chrome%20Extension/streamyars-copy-buttons%20(added%20checkbox)%200.6-2026.01.11/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// manifest.json
var manifest_default = {
  name: "__MSG_extName__",
  manifest_version: 3,
  version: "1.0.0",
  default_locale: "en",
  description: "__MSG_extDescription__",
  background: {
    service_worker: "background/service-worker.ts",
    type: "module"
  },
  permissions: [
    "storage",
    "activeTab",
    "scripting"
  ],
  host_permissions: [
    "https://streamyard.com/*",
    "*://*.youtube.com/*",
    "https://studio.youtube.com/*"
  ],
  content_scripts: [
    {
      matches: ["https://streamyard.com/*"],
      css: ["styles.css"],
      js: [
        "main.ts"
      ]
    },
    {
      matches: ["*://*.youtube.com/*"],
      exclude_matches: ["https://studio.youtube.com/*"],
      css: ["youtube/youtube_styles.css"],
      js: ["youtube/youtube_content.ts"]
    },
    {
      matches: ["https://studio.youtube.com/*"],
      css: ["youtube/studio/studio_styles.css"],
      js: ["youtube/studio/studio_content.ts"],
      run_at: "document_idle"
    }
  ],
  web_accessible_resources: [
    {
      resources: [
        "Release_notes.md",
        "Daily_tips.md",
        "lib/chart.js"
      ],
      matches: ["https://streamyard.com/*", "*://*.youtube.com/*", "https://studio.youtube.com/*"]
    }
  ],
  action: {
    default_title: "StreamYard Helper v1.0.0",
    default_popup: "popup/popup.html"
  },
  options_ui: {
    page: "options/options.html",
    open_in_tab: true
  },
  icons: {
    "16": "assets/imgs/1.png",
    "32": "assets/imgs/1.png",
    "48": "assets/imgs/1.png",
    "128": "assets/imgs/1.png"
  }
};

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [crx({ manifest: manifest_default })],
  server: {
    port: 5173,
    hmr: {
      port: 5173
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXENocm9tZSBFeHRlbnNpb25cXFxcXHUwNDEyXHUwNDQwXHUwNDM1XHUwNDNDXHUwNDRGIFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQzRC4gQ2hyb21lIEV4dGVuc2lvblxcXFxzdHJlYW15YXJzLWNvcHktYnV0dG9ucyAoYWRkZWQgY2hlY2tib3gpIDAuNi0yMDI2LjAxLjExXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxDaHJvbWUgRXh0ZW5zaW9uXFxcXFx1MDQxMlx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQ0RiBcdTA0M0ZcdTA0MzVcdTA0NDBcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0QuIENocm9tZSBFeHRlbnNpb25cXFxcc3RyZWFteWFycy1jb3B5LWJ1dHRvbnMgKGFkZGVkIGNoZWNrYm94KSAwLjYtMjAyNi4wMS4xMVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQ2hyb21lJTIwRXh0ZW5zaW9uLyVEMCU5MiVEMSU4MCVEMCVCNSVEMCVCQyVEMSU4RiUyMCVEMCVCRiVEMCVCNSVEMSU4MCVEMCVCNSVEMCVCQyVEMCVCNSVEMCVCRC4lMjBDaHJvbWUlMjBFeHRlbnNpb24vc3RyZWFteWFycy1jb3B5LWJ1dHRvbnMlMjAoYWRkZWQlMjBjaGVja2JveCklMjAwLjYtMjAyNi4wMS4xMS92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHsgY3J4IH0gZnJvbSAnQGNyeGpzL3ZpdGUtcGx1Z2luJztcbmltcG9ydCBtYW5pZmVzdCBmcm9tICcuL21hbmlmZXN0Lmpzb24nIHdpdGggeyB0eXBlOiAnanNvbicgfTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2NyeCh7IG1hbmlmZXN0IH0pXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBobXI6IHtcbiAgICAgIHBvcnQ6IDUxNzNcbiAgICB9XG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZW1wdHlPdXREaXI6IHRydWVcbiAgfVxufSk7XG4iLCAie1xuICBcIm5hbWVcIjogXCJfX01TR19leHROYW1lX19cIixcbiAgXCJtYW5pZmVzdF92ZXJzaW9uXCI6IDMsXG4gIFwidmVyc2lvblwiOiBcIjEuMC4wXCIsXG4gIFwiZGVmYXVsdF9sb2NhbGVcIjogXCJlblwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiX19NU0dfZXh0RGVzY3JpcHRpb25fX1wiLFxuICBcImJhY2tncm91bmRcIjoge1xuICAgIFwic2VydmljZV93b3JrZXJcIjogXCJiYWNrZ3JvdW5kL3NlcnZpY2Utd29ya2VyLnRzXCIsXG4gICAgXCJ0eXBlXCI6IFwibW9kdWxlXCJcbiAgfSxcbiAgXCJwZXJtaXNzaW9uc1wiOiBbXG4gICAgXCJzdG9yYWdlXCIsXG4gICAgXCJhY3RpdmVUYWJcIixcbiAgICBcInNjcmlwdGluZ1wiXG4gIF0sXG4gIFwiaG9zdF9wZXJtaXNzaW9uc1wiOiBbXG4gICAgXCJodHRwczovL3N0cmVhbXlhcmQuY29tLypcIixcbiAgICBcIio6Ly8qLnlvdXR1YmUuY29tLypcIixcbiAgICBcImh0dHBzOi8vc3R1ZGlvLnlvdXR1YmUuY29tLypcIlxuICBdLFxuICBcImNvbnRlbnRfc2NyaXB0c1wiOiBbXG4gICAge1xuICAgICAgXCJtYXRjaGVzXCI6IFtcImh0dHBzOi8vc3RyZWFteWFyZC5jb20vKlwiXSxcbiAgICAgIFwiY3NzXCI6IFtcInN0eWxlcy5jc3NcIl0sXG4gICAgICBcImpzXCI6IFtcbiAgICAgICAgXCJtYWluLnRzXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIFwibWF0Y2hlc1wiOiBbXCIqOi8vKi55b3V0dWJlLmNvbS8qXCJdLFxuICAgICAgXCJleGNsdWRlX21hdGNoZXNcIjogW1wiaHR0cHM6Ly9zdHVkaW8ueW91dHViZS5jb20vKlwiXSxcbiAgICAgIFwiY3NzXCI6IFtcInlvdXR1YmUveW91dHViZV9zdHlsZXMuY3NzXCJdLFxuICAgICAgXCJqc1wiOiBbXCJ5b3V0dWJlL3lvdXR1YmVfY29udGVudC50c1wiXVxuICAgIH0sXG4gICAge1xuICAgICAgXCJtYXRjaGVzXCI6IFtcImh0dHBzOi8vc3R1ZGlvLnlvdXR1YmUuY29tLypcIl0sXG4gICAgICBcImNzc1wiOiBbXCJ5b3V0dWJlL3N0dWRpby9zdHVkaW9fc3R5bGVzLmNzc1wiXSxcbiAgICAgIFwianNcIjogW1wieW91dHViZS9zdHVkaW8vc3R1ZGlvX2NvbnRlbnQudHNcIl0sXG4gICAgICBcInJ1bl9hdFwiOiBcImRvY3VtZW50X2lkbGVcIlxuICAgIH1cbiAgXSxcbiAgXCJ3ZWJfYWNjZXNzaWJsZV9yZXNvdXJjZXNcIjogW1xuICAgIHtcbiAgICAgIFwicmVzb3VyY2VzXCI6IFtcbiAgICAgICAgXCJSZWxlYXNlX25vdGVzLm1kXCIsXG4gICAgICAgIFwiRGFpbHlfdGlwcy5tZFwiLFxuICAgICAgICBcImxpYi9jaGFydC5qc1wiXG4gICAgICBdLFxuICAgICAgXCJtYXRjaGVzXCI6IFtcImh0dHBzOi8vc3RyZWFteWFyZC5jb20vKlwiLCBcIio6Ly8qLnlvdXR1YmUuY29tLypcIiwgXCJodHRwczovL3N0dWRpby55b3V0dWJlLmNvbS8qXCJdXG4gICAgfVxuICBdLFxuICBcImFjdGlvblwiOiB7XG4gICAgXCJkZWZhdWx0X3RpdGxlXCI6IFwiU3RyZWFtWWFyZCBIZWxwZXIgdjEuMC4wXCIsXG4gICAgXCJkZWZhdWx0X3BvcHVwXCI6IFwicG9wdXAvcG9wdXAuaHRtbFwiXG4gIH0sXG4gIFwib3B0aW9uc191aVwiOiB7XG4gICAgXCJwYWdlXCI6IFwib3B0aW9ucy9vcHRpb25zLmh0bWxcIixcbiAgICBcIm9wZW5faW5fdGFiXCI6IHRydWVcbiAgfSxcbiAgXCJpY29uc1wiOiB7XG4gICAgXCIxNlwiOiBcImFzc2V0cy9pbWdzLzEucG5nXCIsXG4gICAgXCIzMlwiOiBcImFzc2V0cy9pbWdzLzEucG5nXCIsXG4gICAgXCI0OFwiOiBcImFzc2V0cy9pbWdzLzEucG5nXCIsXG4gICAgXCIxMjhcIjogXCJhc3NldHMvaW1ncy8xLnBuZ1wiXG4gIH1cbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFrQixTQUFTLG9CQUFvQjtBQUNsbUIsU0FBUyxXQUFXOzs7QUNEcEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLGtCQUFvQjtBQUFBLEVBQ3BCLFNBQVc7QUFBQSxFQUNYLGdCQUFrQjtBQUFBLEVBQ2xCLGFBQWU7QUFBQSxFQUNmLFlBQWM7QUFBQSxJQUNaLGdCQUFrQjtBQUFBLElBQ2xCLE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxhQUFlO0FBQUEsSUFDYjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUFBLEVBQ0Esa0JBQW9CO0FBQUEsSUFDbEI7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2pCO0FBQUEsTUFDRSxTQUFXLENBQUMsMEJBQTBCO0FBQUEsTUFDdEMsS0FBTyxDQUFDLFlBQVk7QUFBQSxNQUNwQixJQUFNO0FBQUEsUUFDSjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBLE1BQ0UsU0FBVyxDQUFDLHFCQUFxQjtBQUFBLE1BQ2pDLGlCQUFtQixDQUFDLDhCQUE4QjtBQUFBLE1BQ2xELEtBQU8sQ0FBQyw0QkFBNEI7QUFBQSxNQUNwQyxJQUFNLENBQUMsNEJBQTRCO0FBQUEsSUFDckM7QUFBQSxJQUNBO0FBQUEsTUFDRSxTQUFXLENBQUMsOEJBQThCO0FBQUEsTUFDMUMsS0FBTyxDQUFDLGtDQUFrQztBQUFBLE1BQzFDLElBQU0sQ0FBQyxrQ0FBa0M7QUFBQSxNQUN6QyxRQUFVO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLDBCQUE0QjtBQUFBLElBQzFCO0FBQUEsTUFDRSxXQUFhO0FBQUEsUUFDWDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBVyxDQUFDLDRCQUE0Qix1QkFBdUIsOEJBQThCO0FBQUEsSUFDL0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFVO0FBQUEsSUFDUixlQUFpQjtBQUFBLElBQ2pCLGVBQWlCO0FBQUEsRUFDbkI7QUFBQSxFQUNBLFlBQWM7QUFBQSxJQUNaLE1BQVE7QUFBQSxJQUNSLGFBQWU7QUFBQSxFQUNqQjtBQUFBLEVBQ0EsT0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLEVBQ1Q7QUFDRjs7O0FEN0RBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMkJBQVMsQ0FBQyxDQUFDO0FBQUEsRUFDM0IsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsRUFDZjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
