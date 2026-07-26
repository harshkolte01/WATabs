import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  createAccountDefaults,
  type AccountRecord,
  type AppMetadata,
  type AppSettings,
} from "@multi-whatsapp/shared-types";

type Migration = (input: unknown) => unknown;

function asPartialMeta(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object") {
    return input as Record<string, unknown>;
  }
  return {};
}

function upgradeStubAccount(
  raw: Record<string, unknown>,
  index: number,
): AccountRecord {
  const id = String(raw.id ?? "");
  const label = String(raw.label ?? `Account ${index + 1}`);
  const order = typeof raw.order === "number" ? raw.order : index;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : true;
  const partial = raw as Partial<AccountRecord>;
  return createAccountDefaults(id, label, order, {
    ...partial,
    id,
    label,
    order,
    enabled,
    partition:
      typeof raw.partition === "string" && raw.partition.length > 0
        ? raw.partition
        : undefined,
  });
}

function mergeSettings(raw: Record<string, unknown>): AppSettings {
  return {
    launchMinimized:
      typeof raw.launchMinimized === "boolean"
        ? raw.launchMinimized
        : DEFAULT_SETTINGS.launchMinimized,
    notificationsGlobalEnabled:
      typeof raw.notificationsGlobalEnabled === "boolean"
        ? raw.notificationsGlobalEnabled
        : DEFAULT_SETTINGS.notificationsGlobalEnabled,
    notificationsPausedUntil:
      typeof raw.notificationsPausedUntil === "string" ||
      raw.notificationsPausedUntil === null
        ? (raw.notificationsPausedUntil as string | null)
        : DEFAULT_SETTINGS.notificationsPausedUntil,
    closeToTray:
      typeof raw.closeToTray === "boolean" || raw.closeToTray === null
        ? (raw.closeToTray as boolean | null)
        : DEFAULT_SETTINGS.closeToTray,
    startAtLogin:
      typeof raw.startAtLogin === "boolean"
        ? raw.startAtLogin
        : DEFAULT_SETTINGS.startAtLogin,
    startHiddenInTray:
      typeof raw.startHiddenInTray === "boolean"
        ? raw.startHiddenInTray
        : DEFAULT_SETTINGS.startHiddenInTray,
    askWhereToSaveEachFile:
      typeof raw.askWhereToSaveEachFile === "boolean"
        ? raw.askWhereToSaveEachFile
        : DEFAULT_SETTINGS.askWhereToSaveEachFile,
    downloadDirectory:
      typeof raw.downloadDirectory === "string" || raw.downloadDirectory === null
        ? (raw.downloadDirectory as string | null)
        : DEFAULT_SETTINGS.downloadDirectory,
    warnOnExecutableDownload:
      typeof raw.warnOnExecutableDownload === "boolean"
        ? raw.warnOnExecutableDownload
        : DEFAULT_SETTINGS.warnOnExecutableDownload,
  };
}

const toV1: Migration = (input) => {
  const raw = asPartialMeta(input);
  const settings = (raw.settings ?? {}) as Record<string, unknown>;
  return {
    schemaVersion: 1,
    windowState: raw.windowState ?? null,
    settings: {
      launchMinimized:
        typeof settings.launchMinimized === "boolean"
          ? settings.launchMinimized
          : DEFAULT_SETTINGS.launchMinimized,
    },
    accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
  };
};

const toV2: Migration = (input) => {
  const raw = asPartialMeta(input);
  const v1 = toV1(raw) as {
    schemaVersion: number;
    windowState: AppMetadata["windowState"];
    settings: { launchMinimized: boolean };
    accounts: unknown[];
  };

  const accounts = (Array.isArray(v1.accounts) ? v1.accounts : []).map(
    (item, index) =>
      upgradeStubAccount(
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {},
        index,
      ),
  );

  const lastSelected =
    typeof raw.lastSelectedAccountId === "string"
      ? raw.lastSelectedAccountId
      : null;

  return {
    schemaVersion: 2,
    windowState: v1.windowState,
    settings: v1.settings,
    accounts,
    lastSelectedAccountId:
      lastSelected && accounts.some((a) => a.id === lastSelected)
        ? lastSelected
        : null,
  };
};

const toV3: Migration = (input) => {
  const raw = asPartialMeta(input);
  const v2 = toV2(raw) as {
    schemaVersion: number;
    windowState: AppMetadata["windowState"];
    settings: Record<string, unknown>;
    accounts: AccountRecord[];
    lastSelectedAccountId: string | null;
  };

  const accounts = v2.accounts.map((account) =>
    createAccountDefaults(account.id, account.label, account.order, {
      ...account,
      audioMuted:
        typeof account.audioMuted === "boolean" ? account.audioMuted : false,
    }),
  );

  return {
    schemaVersion: 3,
    windowState: v2.windowState,
    settings: mergeSettings(v2.settings ?? {}),
    accounts,
    lastSelectedAccountId: v2.lastSelectedAccountId,
  };
};

const toV4: Migration = (input) => {
  const raw = asPartialMeta(input);
  const v3 = toV3(raw) as AppMetadata;
  return {
    ...v3,
    schemaVersion: 4,
    settings: mergeSettings(v3.settings as unknown as Record<string, unknown>),
  } satisfies AppMetadata;
};

const migrations: Record<number, Migration> = {
  1: toV1,
  2: toV2,
  3: toV3,
  4: toV4,
};

export function createDefaultMetadata(): AppMetadata {
  return toV4({}) as AppMetadata;
}

export function migrateMetadata(raw: unknown): AppMetadata {
  if (raw == null || typeof raw !== "object") {
    return createDefaultMetadata();
  }

  const version =
    "schemaVersion" in raw
      ? Number((raw as { schemaVersion: unknown }).schemaVersion)
      : 0;

  if (!Number.isFinite(version) || version < 0) {
    return createDefaultMetadata();
  }

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Metadata schemaVersion ${version} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    );
  }

  let current: unknown = raw;
  let from = version === 0 ? 0 : version;

  while (from < CURRENT_SCHEMA_VERSION) {
    const next = from + 1;
    const fn = migrations[next];
    if (!fn) {
      break;
    }
    current = fn(current);
    from = next;
  }

  return migrations[CURRENT_SCHEMA_VERSION]!(current) as AppMetadata;
}
