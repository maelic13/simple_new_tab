import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { createManifest, type TargetBrowser } from "./src/manifest";

export default defineConfig(({ mode }) => {
  const targetBrowser: TargetBrowser = mode === "firefox" ? "firefox" : "chrome";

  return {
    plugins: [react(), crx({ manifest: createManifest(targetBrowser), browser: targetBrowser })],
    build: {
      outDir: targetBrowser === "firefox" ? "dist-firefox" : "dist",
      emptyOutDir: true
    }
  };
});
