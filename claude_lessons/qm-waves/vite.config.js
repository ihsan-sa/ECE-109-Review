import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

function getProxyPort() {
  try {
    const portFile = path.join("server", ".proxy-port");
    return parseInt(fs.readFileSync(portFile, "utf8").trim(), 10) || 3001;
  } catch (_) {
    return 3001;
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": `http://localhost:${getProxyPort()}`,
      "/upload": `http://localhost:${getProxyPort()}`,
      "/session": `http://localhost:${getProxyPort()}`,
      "/sessions": `http://localhost:${getProxyPort()}`,
    },
  },
});
