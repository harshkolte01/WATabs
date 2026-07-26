export type SchemaVersion = number;

export type PermissionPreference = "ask" | "allow" | "block";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  bounds: WindowBounds;
  isMaximized: boolean;
}

export interface AppSettings {
  launchMinimized: boolean;
  notificationsGlobalEnabled: boolean;
  notificationsPausedUntil: string | null;
  /** null = ask on first Windows close */
  closeToTray: boolean | null;
  startAtLogin: boolean;
  startHiddenInTray: boolean;
  askWhereToSaveEachFile: boolean;
  /** null → OS Downloads directory */
  downloadDirectory: string | null;
  warnOnExecutableDownload: boolean;
}

export type DownloadState =
  | "starting"
  | "progressing"
  | "paused"
  | "completed"
  | "cancelled"
  | "interrupted";

export interface DownloadRecord {
  id: string;
  accountId: string;
  filename: string;
  targetPath?: string;
  receivedBytes: number;
  totalBytes?: number;
  state: DownloadState;
  startedAt: string;
  completedAt?: string;
  interruptReason?: string;
}

export interface AccountRecord {
  id: string;
  label: string;
  partition: string;
  color?: string;
  icon?: string;
  order: number;
  enabled: boolean;
  loadOnStartup: boolean;
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  unreadBadgeEnabled: boolean;
  audioMuted: boolean;
  microphonePermission: PermissionPreference;
  cameraPermission: PermissionPreference;
  displayCapturePermission: PermissionPreference;
  createdAt: string;
  updatedAt: string;
  lastSelectedAt?: string;
  lastLoadedAt?: string;
}

/** @deprecated Use AccountRecord — kept as alias for migration readability. */
export type AccountRecordStub = AccountRecord;

export interface AppMetadata {
  schemaVersion: SchemaVersion;
  windowState: WindowState | null;
  settings: AppSettings;
  accounts: AccountRecord[];
  lastSelectedAccountId: string | null;
}

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  platform: string;
  isPackaged: boolean;
}

export interface CreateAccountInput {
  label: string;
  color?: string;
  loadOnStartup?: boolean;
}

export interface AccountBadgeState {
  accountId: string;
  count: number | null;
  attention: boolean;
}

export interface NotificationDiagnostics {
  notificationsGlobalEnabled: boolean;
  notificationsPausedUntil: string | null;
  selectedAccountId: string | null;
  selectedNotificationsEnabled: boolean | null;
  selectedAudioMuted: boolean | null;
  selectedViewLoaded: boolean;
  runningInTray: boolean;
  notificationApiSupported: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
}

export const APP_SCHEME = "app";
export const APP_HOST = "shell";
export const SHELL_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const WHATSAPP_ORIGIN = "https://web.whatsapp.com";
export const WHATSAPP_URL = `${WHATSAPP_ORIGIN}/`;

export const SIDEBAR_WIDTH = 240;

/** Windows App User Model ID — keep in sync with Forge packager appId. */
export const APP_USER_MODEL_ID = "com.multiwhatsapp.desktop";

export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  x: 80,
  y: 60,
  width: 1280,
  height: 860,
};

export const DEFAULT_SETTINGS: AppSettings = {
  launchMinimized: false,
  notificationsGlobalEnabled: true,
  notificationsPausedUntil: null,
  closeToTray: null,
  startAtLogin: false,
  startHiddenInTray: false,
  askWhereToSaveEachFile: false,
  downloadDirectory: null,
  warnOnExecutableDownload: true,
};

export const CURRENT_SCHEMA_VERSION = 4 as const;

export function partitionName(accountId: string): string {
  return `persist:wa-${accountId}`;
}

export function createAccountDefaults(
  id: string,
  label: string,
  order: number,
  extras: Partial<AccountRecord> = {},
): AccountRecord {
  const now = new Date().toISOString();
  const cleaned = Object.fromEntries(
    Object.entries(extras).filter(([, value]) => value !== undefined),
  ) as Partial<AccountRecord>;
  return {
    id,
    label,
    partition: partitionName(id),
    order,
    enabled: true,
    loadOnStartup: true,
    notificationsEnabled: true,
    notificationSoundEnabled: true,
    unreadBadgeEnabled: true,
    audioMuted: false,
    microphonePermission: "ask",
    cameraPermission: "ask",
    displayCapturePermission: "ask",
    createdAt: now,
    updatedAt: now,
    ...cleaned,
  };
}
