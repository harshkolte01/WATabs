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
  notificationsGlobalEnabled: z.boolean(),
  notificationsPausedUntil: z.string().nullable(),
  closeToTray: z.boolean().nullable(),
  startAtLogin: z.boolean(),
  startHiddenInTray: z.boolean(),
  askWhereToSaveEachFile: z.boolean(),
  downloadDirectory: z.string().nullable(),
  warnOnExecutableDownload: z.boolean(),
});

export const downloadStateSchema = z.enum([
  "starting",
  "progressing",
  "paused",
  "completed",
  "cancelled",
  "interrupted",
]);

export const downloadRecordSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  filename: z.string().min(1),
  targetPath: z.string().optional(),
  receivedBytes: z.number().nonnegative(),
  totalBytes: z.number().nonnegative().optional(),
  state: downloadStateSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().optional(),
  interruptReason: z.string().optional(),
});

export const downloadIdSchema = z.string().uuid();

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
  audioMuted: z.boolean(),
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

export const setAudioMutedInputSchema = z.object({
  accountId: accountIdSchema,
  muted: z.boolean(),
});

export const updateAccountPermissionsSchema = z.object({
  accountId: accountIdSchema,
  patch: z.object({
    notificationsEnabled: z.boolean().optional(),
    notificationSoundEnabled: z.boolean().optional(),
    unreadBadgeEnabled: z.boolean().optional(),
    microphonePermission: permissionPreferenceSchema.optional(),
    cameraPermission: permissionPreferenceSchema.optional(),
    displayCapturePermission: permissionPreferenceSchema.optional(),
  }),
});

export const permissionPromptResponseSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum([
    "allow-once",
    "allow-always",
    "block",
    "deny",
    "open",
    "cancel",
  ]),
});

export const closeToTrayChoiceSchema = z.object({
  requestId: z.string().uuid(),
  choice: z.enum(["keep", "quit"]),
  remember: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;
export type UpdateAccountPermissionsInput = z.infer<
  typeof updateAccountPermissionsSchema
>;

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
  accountsSetAudioMuted: "desktop:accounts:set-audio-muted",
  accountsReload: "desktop:accounts:reload",
  accountsClearSession: "desktop:accounts:clear-session",
  accountsRemove: "desktop:accounts:remove",
  accountsChanged: "desktop:accounts:changed",
  permissionsGet: "desktop:permissions:get",
  permissionsUpdate: "desktop:permissions:update",
  permissionsRespondPrompt: "desktop:permissions:respond-prompt",
  permissionsPrompt: "desktop:permissions:prompt",
  notificationsGetDiagnostics: "desktop:notifications:get-diagnostics",
  notificationsSendTest: "desktop:notifications:send-test",
  notificationsBadgesChanged: "desktop:notifications:badges-changed",
  windowCloseDecision: "desktop:window:close-decision",
  windowClosePrompt: "desktop:window:close-prompt",
  downloadsList: "desktop:downloads:list",
  downloadsCancel: "desktop:downloads:cancel",
  downloadsPause: "desktop:downloads:pause",
  downloadsResume: "desktop:downloads:resume",
  downloadsShowInFolder: "desktop:downloads:show-in-folder",
  downloadsClearHistory: "desktop:downloads:clear-history",
  downloadsChooseDirectory: "desktop:downloads:choose-directory",
  downloadsOpen: "desktop:downloads:open",
  downloadsChanged: "desktop:downloads:changed",
} as const;

export type IpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];

export function sanitizeAccountLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").slice(0, 64);
}
