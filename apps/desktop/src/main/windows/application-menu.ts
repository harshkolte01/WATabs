import { Menu, app } from "electron";
import { shellDevToolsEnabled } from "../accounts/devtools-policy";

/**
 * Packaged builds: no Toggle Developer Tools entry.
 * Dev (`pnpm start`): keep Electron defaults so engineers can debug.
 */
export function installApplicationMenu(): void {
  if (!app.isPackaged && shellDevToolsEnabled(false)) {
    // Keep Electron's default menu (includes DevTools) for local development.
    return;
  }

  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            role: "appMenu" as const,
          },
        ]
      : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
