import {
  app,
  BrowserWindow,
  ipcMain,
  WebContentsView,
  Menu,
} from "electron";
import path from "node:path";
import {
  ACCOUNT_A_ID,
  ACCOUNT_B_ID,
  ACCOUNTS,
  TOOLBAR_HEIGHT,
  type AccountId,
} from "./constants";
import { configureDesktopApp } from "./bootstrap";
import { createAccountView, type AccountViewHandle } from "./account-view";

configureDesktopApp();

type AccountKey = "a" | "b";

let mainWindow: BrowserWindow | null = null;
let shellView: WebContentsView | null = null;
const accounts = new Map<AccountId, AccountViewHandle>();
let activeKey: AccountKey = "a";
/** Ignore startup focus churn from both WebContentsView instances finishing load. */
let focusRoutingEnabled = false;

function accountIdForKey(key: AccountKey): AccountId {
  return key === "a" ? ACCOUNT_A_ID : ACCOUNT_B_ID;
}

function keyForAccountId(id: AccountId): AccountKey {
  return id === ACCOUNT_A_ID ? "a" : "b";
}

function layoutViews(): void {
  if (!mainWindow || !shellView) {
    return;
  }

  const { width, height } = mainWindow.getContentBounds();
  shellView.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT });

  const contentHeight = Math.max(0, height - TOOLBAR_HEIGHT);
  for (const handle of accounts.values()) {
    const isActive = handle.id === accountIdForKey(activeKey);
    handle.view.setBounds(
      isActive
        ? { x: 0, y: TOOLBAR_HEIGHT, width, height: contentHeight }
        : { x: 0, y: TOOLBAR_HEIGHT, width: 0, height: 0 },
    );
  }
}

function setActiveAccount(key: AccountKey): void {
  activeKey = key;
  layoutViews();

  const handle = accounts.get(accountIdForKey(key));
  if (mainWindow && handle) {
    mainWindow.setTitle(`Multi Account Desktop — ${handle.label}`);
  }

  shellView?.webContents.send("desktop:active-account", key);
}

function createShellView(): WebContentsView {
  const preloadPath = path.join(__dirname, "shell-preload.js");
  const view = new WebContentsView({
    webPreferences: {
      // Shell uses the default session — never load WhatsApp here.
      partition: "persist:desktop-shell",
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
    },
  });

  void view.webContents.loadFile(path.join(__dirname, "static", "shell.html"));
  return view;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Multi Account Desktop",
    backgroundColor: "#0f1418",
    webPreferences: {
      // The window's own webContents is unused; content is WebContentsViews.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  shellView = createShellView();
  mainWindow.contentView.addChildView(shellView);

  for (const account of ACCOUNTS) {
    const handle = createAccountView(account.id, account.label);
    accounts.set(account.id, handle);
    // Keep both views attached so background sessions stay alive for notifications.
    mainWindow.contentView.addChildView(handle.view);
  }

  setActiveAccount("a");
  setTimeout(() => {
    focusRoutingEnabled = true;
  }, 2500);

  mainWindow.on("resize", () => {
    layoutViews();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    shellView = null;
    accounts.clear();
  });

  // Record default Electron identity for the proof checklist (no UA spoofing).
  console.log(`[desktop] electron=${process.versions.electron}`);
  console.log(`[desktop] chrome=${process.versions.chrome}`);
  console.log(`[desktop] userAgentFallback=${app.userAgentFallback}`);
  console.log(`[desktop] userData=${app.getPath("userData")}`);
  console.log(`[desktop] partitions=${[...accounts.values()].map((a) => a.partition).join(", ")}`);
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Accounts",
      submenu: [
        {
          label: "Account A",
          accelerator: "CmdOrCtrl+1",
          click: () => setActiveAccount("a"),
        },
        {
          label: "Account B",
          accelerator: "CmdOrCtrl+2",
          click: () => setActiveAccount("b"),
        },
        { type: "separator" },
        {
          label: "Reload Active Account",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            accounts.get(accountIdForKey(activeKey))?.view.webContents.reload();
          },
        },
        {
          label: "Toggle DevTools (Active)",
          accelerator: "F12",
          click: () => {
            const wc = accounts.get(accountIdForKey(activeKey))?.view.webContents;
            if (!wc) return;
            if (wc.isDevToolsOpened()) {
              wc.closeDevTools();
            } else {
              wc.openDevTools({ mode: "detach" });
            }
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Shell DevTools",
          click: () => {
            const wc = shellView?.webContents;
            if (!wc) return;
            if (wc.isDevToolsOpened()) {
              wc.closeDevTools();
            } else {
              wc.openDevTools({ mode: "detach" });
            }
          },
        },
      ],
    },
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "quit" },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  ipcMain.on("desktop:switch-account", (_event, key: AccountKey) => {
    if (key === "a" || key === "b") {
      setActiveAccount(key);
    }
  });

  ipcMain.handle("desktop:get-active-account", () => activeKey);

  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Help map notification activation to the owning account when Chromium focuses a view.
app.on("web-contents-created", (_event, contents) => {
  contents.on("dom-ready", () => {
    for (const handle of accounts.values()) {
      if (handle.view.webContents.id === contents.id) {
        console.log(`[desktop] webContents ready for ${handle.label} (${handle.partition})`);
      }
    }
  });

  // If focus moves into a WhatsApp view (e.g. notification click), reflect that in the shell.
  contents.on("focus", () => {
    if (!focusRoutingEnabled) {
      return;
    }
    for (const handle of accounts.values()) {
      if (handle.view.webContents.id === contents.id) {
        const key = keyForAccountId(handle.id);
        if (key !== activeKey) {
          console.log(`[desktop] focus moved to ${handle.label}; selecting it`);
          setActiveAccount(key);
        }
      }
    }
  });
});
