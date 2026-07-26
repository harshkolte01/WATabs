import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "../../tests/unit/**/*.test.ts",
      "../../tests/security/**/*.test.ts",
      "src/**/*.test.ts",
    ],

  },
  resolve: {
    alias: {
      "@multi-whatsapp/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts",
      ),
      "@multi-whatsapp/validation": path.resolve(
        __dirname,
        "../../packages/validation/src/index.ts",
      ),
    },
  },
});
