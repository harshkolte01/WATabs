import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  createAccountDefaults,
  type AccountRecord,
  type AppMetadata,
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
    settings: AppMetadata["settings"];
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
  } satisfies AppMetadata;
};

const migrations: Record<number, Migration> = {
  1: toV1,
  2: toV2,
};

export function createDefaultMetadata(): AppMetadata {
  return toV2({}) as AppMetadata;
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
