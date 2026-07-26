import { useCallback, useEffect, useState } from "react";
import type {
  AccountRecord,
  AppInfo,
  AppSettings,
} from "@multi-whatsapp/shared-types";

type Tab = "accounts" | "settings";

type ConfirmAction =
  | { kind: "clearSession"; accountId: string; label: string }
  | { kind: "remove"; accountId: string; label: string };

export function App() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const refreshAccounts = useCallback(async () => {
    const result = await window.desktop.accounts.list();
    setAccounts(result.accounts);
    setSelectedAccountId(result.selectedAccountId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const [appInfo, appSettings] = await Promise.all([
          window.desktop.getAppInfo(),
          window.desktop.getSettings(),
        ]);
        if (cancelled) return;
        setInfo(appInfo);
        setSettings(appSettings);
        await refreshAccounts();
        unsubscribe = window.desktop.accounts.onChanged(() => {
          void refreshAccounts();
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load shell");
        }
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refreshAccounts]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function openAddForm(): void {
    setAdding(true);
    setAddLabel(`Account ${accounts.length + 1}`);
    setError(null);
  }

  async function onAddAccount(): Promise<void> {
    const label = addLabel.trim();
    if (!label) {
      setError("Account label is required");
      return;
    }
    await run(() => window.desktop.accounts.create({ label }));
    setAdding(false);
    setAddLabel("");
  }

  async function onSelect(accountId: string): Promise<void> {
    await run(() => window.desktop.accounts.select(accountId));
  }

  async function onRename(accountId: string): Promise<void> {
    if (!renameValue.trim()) return;
    await run(() => window.desktop.accounts.rename(accountId, renameValue));
    setRenameId(null);
  }

  async function onMove(accountId: string, direction: -1 | 1): Promise<void> {
    const ids = accounts.map((a) => a.id);
    const index = ids.indexOf(accountId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    await run(() => window.desktop.accounts.reorder(next));
  }

  async function onToggleEnabled(account: AccountRecord): Promise<void> {
    await run(() =>
      window.desktop.accounts.setEnabled(account.id, !account.enabled),
    );
  }

  async function onReload(accountId: string): Promise<void> {
    await run(() => window.desktop.accounts.reload(accountId));
  }

  async function onConfirmAction(): Promise<void> {
    if (!confirm) return;
    const action = confirm;
    setConfirm(null);
    if (action.kind === "clearSession") {
      await run(() => window.desktop.accounts.clearSession(action.accountId));
      return;
    }
    await run(() => window.desktop.accounts.remove(action.accountId));
  }

  async function onToggleLaunchMinimized(): Promise<void> {
    if (!settings) return;
    const next = await window.desktop.updateSettings({
      launchMinimized: !settings.launchMinimized,
    });
    setSettings(next);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Multi Account Desktop</div>
        <div className="nav-label">Accounts</div>
        {adding ? (
          <div className="inline-form add-form">
            <input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              maxLength={64}
              placeholder="Account label"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void onAddAccount();
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAddAccount()}
            >
              Create
            </button>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => openAddForm()}
          >
            Add account
          </button>
        )}
        {error ? <p className="error sidebar-error">{error}</p> : null}
        {confirm ? (
          <div className="confirm-box">
            <p>
              {confirm.kind === "clearSession"
                ? `Clear the local session for “${confirm.label}”? You will need to scan the QR code again. This does not delete your WhatsApp account.`
                : `Remove “${confirm.label}”? Other accounts are not affected. This does not delete your WhatsApp account on your phone.`}
            </p>
            <div className="inline-form">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onConfirmAction()}
              >
                {confirm.kind === "clearSession" ? "Clear session" : "Remove"}
              </button>
              <button type="button" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <ul className="account-list">
          {accounts.map((account) => {
            const active = account.id === selectedAccountId;
            return (
              <li
                key={account.id}
                className={[
                  "account-item",
                  active ? "active" : "",
                  account.enabled ? "" : "disabled",
                ].join(" ")}
              >
                <button
                  type="button"
                  className="account-select"
                  disabled={busy || !account.enabled}
                  onClick={() => void onSelect(account.id)}
                >
                  <span className="account-label">{account.label}</span>
                  {!account.enabled ? (
                    <span className="pill">Disabled</span>
                  ) : null}
                </button>
                {renameId === account.id ? (
                  <div className="inline-form">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      maxLength={64}
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRename(account.id)}
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setRenameId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="account-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRenameId(account.id);
                        setRenameValue(account.label);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onMove(account.id, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onMove(account.id, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onToggleEnabled(account)}
                    >
                      {account.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !account.enabled}
                      onClick={() => void onReload(account.id)}
                    >
                      Reload
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({
                          kind: "clearSession",
                          accountId: account.id,
                          label: account.label,
                        })
                      }
                    >
                      Clear session
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setConfirm({
                          kind: "remove",
                          accountId: account.id,
                          label: account.label,
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="nav-label">App</div>
        <button
          type="button"
          className={tab === "accounts" ? "nav-active" : ""}
          onClick={() => setTab("accounts")}
        >
          Workspace
        </button>
        <button
          type="button"
          className={tab === "settings" ? "nav-active" : ""}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
        {tab === "settings" ? (
          <div className="settings sidebar-settings">
            <div className="row">
              <span>Launch minimized</span>
              <button
                type="button"
                onClick={() => void onToggleLaunchMinimized()}
              >
                {settings?.launchMinimized ? "On" : "Off"}
              </button>
            </div>
            <div className="row">
              <span>Window state</span>
              <button
                type="button"
                onClick={() => void window.desktop.resetWindowState()}
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
        <div className="meta">
          Isolated WhatsApp Web sessions. Shell stays local-only.
          {info ? (
            <>
              <br />
              Electron {info.electron}
            </>
          ) : null}
        </div>
      </aside>
      <main className="main">
        <section className="content-pane">
          {accounts.length === 0 ? (
            <div className="empty">
              <strong>No accounts yet</strong>
              <p>
                Add an account to open the official WhatsApp Web interface in
                an isolated local session. Scan the QR code with your phone
                when it appears.
              </p>
              <button
                type="button"
                disabled={busy || adding}
                onClick={() => openAddForm()}
              >
                Add your first account
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
