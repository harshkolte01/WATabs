import { z } from "zod";

export const windowBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(400),
  height: z.number().int().min(300),
});

export const windowStateSchema = z.object({
  bounds: windowBoundsSchema,
  isMaximized: z.boolean(),
});

export const appSettingsSchema = z.object({
  launchMinimized: z.boolean(),
});

export const accountRecordStubSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(64),
  partition: z.string().min(1),
  order: z.number().int().nonnegative(),
  enabled: z.boolean(),
});

export const appMetadataSchema = z.object({
  schemaVersion: z.number().int().positive(),
  windowState: windowStateSchema.nullable(),
  settings: appSettingsSchema,
  accounts: z.array(accountRecordStubSchema),
});

export const updateSettingsSchema = appSettingsSchema.partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const ipcChannels = {
  getAppInfo: "desktop:get-app-info",
  getWindowState: "desktop:get-window-state",
  resetWindowState: "desktop:reset-window-state",
  getSettings: "desktop:get-settings",
  updateSettings: "desktop:update-settings",
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
