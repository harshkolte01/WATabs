import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PRODUCTION_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "production-csp",
      transformIndexHtml(html, ctx) {
        if (ctx.server) {
          return html;
        }
        return html.replace(
          /http-equiv="Content-Security-Policy"\s+content="[^"]*"/,
          `http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}"`,
        );
      },
    },
  ],
});
