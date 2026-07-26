import path from "node:path";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";
import { APP_HOST, APP_SCHEME } from "@multi-whatsapp/shared-types";

/**
 * Register privileged watabs:// scheme before app ready.
 * Production shell loads via watabs://shell/ — never remote content.
 */
export function registerAppSchemePrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

function rendererRoot(): string {
  // Forge Vite production output for renderer name "main_window"
  return path.join(__dirname, `../renderer/main_window`);
}

export function registerAppProtocolHandler(): void {
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== APP_HOST) {
      return new Response("Not found", { status: 404 });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    const filePath = path.normalize(path.join(rendererRoot(), pathname));
    const root = path.normalize(rendererRoot() + path.sep);
    if (!filePath.startsWith(root)) {
      return new Response("Forbidden", { status: 403 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

export function shellIndexUrl(): string {
  return `${APP_SCHEME}://${APP_HOST}/index.html`;
}
