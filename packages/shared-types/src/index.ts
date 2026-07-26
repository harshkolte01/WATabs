export type SchemaVersion = number;

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
}

export interface AccountRecordStub {
  id: string;
  label: string;
  partition: string;
  order: number;
  enabled: boolean;
}

export interface AppMetadata {
  schemaVersion: SchemaVersion;
  windowState: WindowState | null;
  settings: AppSettings;
  accounts: AccountRecordStub[];
}

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
  platform: string;
  isPackaged: boolean;
}

export const APP_SCHEME = "app";
export const APP_HOST = "shell";
export const SHELL_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  x: 80,
  y: 60,
  width: 1280,
  height: 860,
};

export const DEFAULT_SETTINGS: AppSettings = {
  launchMinimized: false,
};

export const CURRENT_SCHEMA_VERSION = 1 as const;
