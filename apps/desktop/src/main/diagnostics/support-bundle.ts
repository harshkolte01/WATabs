import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { app, dialog } from "electron";
import { LOG_DIRNAME } from "../../shared/constants";
import { getSystemStatus } from "./system-status";
import { sanitizeLogFields } from "./redaction";
import { getSettings, loadMetadata } from "../storage/metadata-store";
import { log } from "./log-manager";

const MAX_LOG_LINES = 400;

export type SupportBundlePreview = {
  files: { name: string; description: string; bytes: number }[];
  excludes: string[];
  generatedAt: string;
};

function readRecentLogLines(): string {
  const dir = path.join(app.getPath("userData"), LOG_DIRNAME);
  if (!fs.existsSync(dir)) {
    return "";
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".log"))
    .sort()
    .reverse();
  const latest = files[0];
  if (!latest) return "";
  const text = fs.readFileSync(path.join(dir, latest), "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(-MAX_LOG_LINES).join("\n");
}

function buildPayload(): Record<string, unknown> {
  const settings = getSettings();
  const meta = loadMetadata();
  return sanitizeLogFields({
    generatedAt: new Date().toISOString(),
    systemStatus: getSystemStatus(),
    schemaVersion: meta.schemaVersion,
    settingsSummary: {
      launchMinimized: settings.launchMinimized,
      notificationsGlobalEnabled: settings.notificationsGlobalEnabled,
      closeToTray: settings.closeToTray,
      startAtLogin: settings.startAtLogin,
      askWhereToSaveEachFile: settings.askWhereToSaveEachFile,
      warnOnExecutableDownload: settings.warnOnExecutableDownload,
      appLockEnabled: settings.appLockEnabled,
      autoLockMinutes: settings.autoLockMinutes,
      lockOnOsLock: settings.lockOnOsLock,
      // never: pin, verifier, downloadDirectory absolute path optional
      hasCustomDownloadDirectory: Boolean(settings.downloadDirectory),
      accountCount: meta.accounts.length,
    },
    recentLogs: readRecentLogLines(),
  }) as Record<string, unknown>;
}

export function previewSupportBundle(): SupportBundlePreview {
  const payload = buildPayload();
  const json = JSON.stringify(payload, null, 2);
  const logs = String(payload.recentLogs ?? "");
  return {
    generatedAt: String(payload.generatedAt),
    files: [
      {
        name: "system-status.json",
        description: "App/OS versions, view statuses, lock flags (no PIN)",
        bytes: Buffer.byteLength(JSON.stringify(payload.systemStatus)),
      },
      {
        name: "settings-summary.json",
        description: "Non-sensitive settings summary",
        bytes: Buffer.byteLength(JSON.stringify(payload.settingsSummary)),
      },
      {
        name: "recent-logs.txt",
        description: "Last redacted log lines",
        bytes: Buffer.byteLength(logs),
      },
      {
        name: "bundle-meta.json",
        description: "Bundle timestamp and schema version",
        bytes: Buffer.byteLength(json),
      },
    ],
    excludes: [
      "Chromium Partitions / session storage",
      "Cookies and tokens",
      "WhatsApp message/notification content",
      "PIN / lock verifier",
      "Screenshots",
      "Downloaded file bytes",
    ],
  };
}

/** Minimal ZIP (store + deflate) for a few text entries — no third-party deps. */
function zipUtf8Files(
  files: { name: string; content: string }[],
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const data = zlib.deflateRawSync(Buffer.from(file.content, "utf8"));
    const crc = crc32(Buffer.from(file.content, "utf8"));
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(Buffer.byteLength(file.content), 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc >>> 0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(Buffer.byteLength(file.content), 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralDir, end]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c;
}

export async function createSupportBundle(): Promise<{ path: string | null }> {
  const payload = buildPayload();
  const files = [
    {
      name: "system-status.json",
      content: JSON.stringify(payload.systemStatus, null, 2),
    },
    {
      name: "settings-summary.json",
      content: JSON.stringify(payload.settingsSummary, null, 2),
    },
    {
      name: "recent-logs.txt",
      content: String(payload.recentLogs ?? ""),
    },
    {
      name: "bundle-meta.json",
      content: JSON.stringify(
        {
          generatedAt: payload.generatedAt,
          schemaVersion: payload.schemaVersion,
          excludes: previewSupportBundle().excludes,
        },
        null,
        2,
      ),
    },
  ];

  const zip = zipUtf8Files(files);
  const result = await dialog.showSaveDialog({
    title: "Save support bundle",
    defaultPath: `watabs-support-${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: "ZIP", extensions: ["zip"] }],
  });
  if (result.canceled || !result.filePath) {
    return { path: null };
  }
  fs.writeFileSync(result.filePath, zip);
  log("info", "support_bundle_created", {
    bytes: zip.length,
  });
  return { path: result.filePath };
}

/** Test helper: ensure denylist paths never appear in payload keys/values as partition roots. */
export function supportBundleContainsPartitionData(
  payload: Record<string, unknown> = buildPayload(),
): boolean {
  const json = JSON.stringify(payload);
  return /Partitions|Cookies|lock-verifier|Local Storage/i.test(json);
}
