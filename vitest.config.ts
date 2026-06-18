import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://simple-new-tab.test/"
      }
    },
    globals: true,
    setupFiles: ["src/test/setup.ts"]
  }
});
