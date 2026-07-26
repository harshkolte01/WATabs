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

export const permissionPreferenceSchema = z.enum(["ask", "allow", "block"]);

export const accountRecordSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(64),
  partition: z.string().min(1),
  color: z.string().max(32).optional(),
  icon: z.string().max(64).optional(),
  order: z.number().int().nonnegative(),
  enabled: z.boolean(),
  loadOnStartup: z.boolean(),
  notificationsEnabled: z.boolean(),
  notificationSoundEnabled: z.boolean(),
  unreadBadgeEnabled: z.boolean(),
  microphonePermission: permissionPreferenceSchema,
  cameraPermission: permissionPreferenceSchema,
  displayCapturePermission: permissionPreferenceSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  lastSelectedAt: z.string().optional(),
  lastLoadedAt: z.string().optional(),
});

/** Legacy stub schema (schema v1 accounts). */
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
  accounts: z.array(accountRecordSchema),
  lastSelectedAccountId: z.string().uuid().nullable(),
});

export const updateSettingsSchema = appSettingsSchema.partial();

export const createAccountInputSchema = z.object({
  label: z.string().trim().min(1).max(64),
  color: z.string().max(32).optional(),
  loadOnStartup: z.boolean().optional(),
});

export const accountIdSchema = z.string().uuid();

export const renameAccountInputSchema = z.object({
  accountId: accountIdSchema,
  label: z.string().trim().min(1).max(64),
});

export const reorderAccountsInputSchema = z.object({
  accountIds: z.array(accountIdSchema).min(1),
});

export const setEnabledInputSchema = z.object({
  accountId: accountIdSchema,
  enabled: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

export const ipcChannels = {
  getAppInfo: "desktop:get-app-info",
  getWindowState: "desktop:get-window-state",
  resetWindowState: "desktop:reset-window-state",
  getSettings: "desktop:get-settings",
  updateSettings: "desktop:update-settings",
  accountsList: "desktop:accounts:list",
  accountsCreate: "desktop:accounts:create",
  accountsSelect: "desktop:accounts:select",
  accountsRename: "desktop:accounts:rename",
  accountsReorder: "desktop:accounts:reorder",
  accountsSetEnabled: "desktop:accounts:set-enabled",
  accountsReload: "desktop:accounts:reload",
  accountsClearSession: "desktop:accounts:clear-session",
  accountsRemove: "desktop:accounts:remove",
  accountsChanged: "desktop:accounts:changed",
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];

export function sanitizeAccountLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").slice(0, 64);
}
