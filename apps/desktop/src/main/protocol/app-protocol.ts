import path from "node:path";
import { pathToFileURL } from "node:url";
import { net, protocol, session } from "electron";
import { APP_HOST, APP_SCHEME } from "@multi-whatsapp/shared-types";

/** Shell WebContentsView partition — must match protocol handler registration. */
export const SHELL_PARTITION = "persist:desktop-shell";

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

function isPathInsideRoot(rootDir: string, filePath: string): boolean {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(filePath);
  const rel = path.relative(root, candidate);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function handleAppProtocolRequest(request: Request): Promise<Response> | Response {
  const url = new URL(request.url);
  if (url.hostname !== APP_HOST) {
    return new Response("Not found", { status: 404 });
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  const root = rendererRoot();
  const filePath = path.normalize(path.join(root, pathname));
  if (!isPathInsideRoot(root, filePath)) {
    return new Response("Forbidden", { status: 403 });
  }

  return net.fetch(pathToFileURL(filePath).toString());
}

/**
 * Bind watabs:// on the shell session. `protocol.handle` on the default session
 * does NOT apply to partitioned WebContents — packaged loads then fall through
 * to Windows (“Get an app to open this 'watabs' link”) and the shell stays blank.
 */
export function registerAppProtocolHandler(): void {
  const shellSession = session.fromPartition(SHELL_PARTITION);
  shellSession.protocol.handle(APP_SCHEME, handleAppProtocolRequest);
  // Cover any non-partitioned loads as well.
  protocol.handle(APP_SCHEME, handleAppProtocolRequest);
}

export function shellIndexUrl(): string {
  return `${APP_SCHEME}://${APP_HOST}/index.html`;
}
