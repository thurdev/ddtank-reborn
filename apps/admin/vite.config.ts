import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        // site-admin-redesign: game-window previews read the client's real exported UI art through the API's
        // read-only passthrough (apps/api/src/routes/static.ts "/client-assets/*"), not a hardcoded client
        // dev-server port.
        "/client-assets": { target: apiTarget, changeOrigin: true },
      },
    },
    preview: { port: 5174 },
  };
});
