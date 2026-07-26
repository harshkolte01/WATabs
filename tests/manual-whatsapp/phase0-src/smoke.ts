/**
 * Automated desktop smoke: launch the app, wait for both WhatsApp views to
 * finish loading, record UA / titles, fail on unsupported-client signals.
 *
 * Does not call executeJavaScript against WhatsApp views.
 * Does not perform QR login (manual).
 */
import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  ACCOUNTS,
  TOOLBAR_HEIGHT,
  WHATSAPP_ORIGIN,
  partitionName,
} from "./constants";
import { configureDesktopApp } from "./bootstrap";
import { createAccountView, loadWhatsApp } from "./account-view";

configureDesktopApp();

const BLOCK_TITLE_RE =
  /unsupported|not\s*supported|browser\s*not\s*supported|update\s*your\s*browser|chrome\s*is\s*required/i;

const TIMEOUT_MS = 90_000;

interface ViewResult {
  label: string;
  partition: string;
  url: string;
  title: string;
  failed: boolean;
  failDescription?: string;
}

async function waitForLoad(
  view: Electron.WebContentsView,
  label: string,
  partition: string,
): Promise<ViewResult> {
  return new Promise((resolve) => {
    const result: ViewResult = {
      label,
      partition,
      url: "",
      title: "",
      failed: false,
    };

    const finish = () => {
      result.url = view.webContents.getURL();
      result.title = view.webContents.getTitle();
      resolve(result);
    };

    const timer = setTimeout(() => {
      result.failed = true;
      result.failDescription = `timeout after ${TIMEOUT_MS}ms`;
      finish();
    }, TIMEOUT_MS);

    view.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
      if (!isMainFrame) return;
      result.failed = true;
      result.failDescription = `did-fail-load ${code} ${desc} ${url}`;
    });

    view.webContents.on("did-finish-load", () => {
      // Give the SPA a moment to set a meaningful title.
      setTimeout(() => {
        clearTimeout(timer);
        finish();
      }, 8000);
    });
  });
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const results: ViewResult[] = [];

  for (const account of ACCOUNTS) {
    const handle = createAccountView(account.id, account.label, { autoLoad: false });
    win.contentView.addChildView(handle.view);
    handle.view.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width: 1280,
      height: 800,
    });

    const pending = waitForLoad(
      handle.view,
      account.label,
      partitionName(account.id),
    );
    loadWhatsApp(handle.view);
    results.push(await pending);
  }

  const userData = app.getPath("userData");
  const partitionDirs = ACCOUNTS.map((account) => {
    const dir = path.join(
      userData,
      "Partitions",
      `wa-${account.id}`,
    );
    return {
      label: account.label,
      dir,
      exists: fs.existsSync(dir),
    };
  });

  const report = {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    userAgentFallback: app.userAgentFallback,
    platform: process.platform,
    userData,
    whatsappOrigin: WHATSAPP_ORIGIN,
    partitionDirs,
    views: results,
  };

  console.log("[smoke] REPORT_JSON " + JSON.stringify(report, null, 2));

  let exitCode = 0;

  for (const view of results) {
    if (view.failed) {
      console.error(`[smoke] FAIL ${view.label}: ${view.failDescription}`);
      exitCode = 1;
      continue;
    }
    if (!view.url.startsWith(WHATSAPP_ORIGIN)) {
      console.error(`[smoke] FAIL ${view.label}: unexpected url ${view.url}`);
      exitCode = 1;
      continue;
    }
    if (BLOCK_TITLE_RE.test(view.title)) {
      console.error(
        `[smoke] FAIL ${view.label}: possible unsupported-client block title="${view.title}"`,
      );
      exitCode = 2;
      continue;
    }
    console.log(`[smoke] OK ${view.label} title="${view.title}" url=${view.url}`);
  }

  for (const part of partitionDirs) {
    if (!part.exists) {
      console.error(`[smoke] FAIL missing partition dir ${part.dir}`);
      exitCode = 1;
    } else {
      console.log(`[smoke] OK partition dir ${part.label}: ${part.dir}`);
    }
  }

  if (
    partitionDirs.length === 2 &&
    partitionDirs[0]?.dir === partitionDirs[1]?.dir
  ) {
    console.error("[smoke] FAIL partition directories are not distinct");
    exitCode = 1;
  }

  const outPath = path.join(__dirname, "..", "smoke-last.json");
  fs.writeFileSync(outPath, JSON.stringify({ ...report, exitCode }, null, 2), "utf8");
  console.log(`[smoke] wrote ${outPath}`);

  app.exit(exitCode);
});
