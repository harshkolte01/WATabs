import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type AppMetadata,
} from "@multi-whatsapp/shared-types";

type Migration = (input: unknown) => AppMetadata;

const toV1: Migration = (input) => {
  const raw = (input ?? {}) as Partial<AppMetadata>;
  return {
    schemaVersion: 1,
    windowState: raw.windowState ?? null,
    settings: {
      launchMinimized:
        raw.settings?.launchMinimized ?? DEFAULT_SETTINGS.launchMinimized,
    },
    accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
  };
};

const migrations: Record<number, Migration> = {
  1: toV1,
};

export function createDefaultMetadata(): AppMetadata {
  return toV1({});
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

  // Re-normalize current schema through the latest migrator for defaults.
  return migrations[CURRENT_SCHEMA_VERSION]!(current);
}
