import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "electron",
        "electron-updater",
        "builder-util-runtime",
        "js-yaml",
        "lazy-val",
        "lodash.escaperegexp",
        "lodash.isequal",
        "semver",
        "tiny-typed-emitter",
        "fs-extra",
        "node:fs",
        "node:fs/promises",
        "node:path",
        "node:os",
        "node:url",
      ],
    },
  },
});
