import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["electron", "node:fs", "node:fs/promises", "node:path", "node:os", "node:url"],
    },
  },
});
