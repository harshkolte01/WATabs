import { useCallback, useEffect, useState } from "react";
import type {
  AccountBadgeState,
  AccountRecord,
  AppInfo,
  AppSettings,
  NotificationDiagnostics,
  PermissionPreference,
} from "@multi-whatsapp/shared-types";
import type {
  ClosePromptPayload,
  DownloadUiRecord,
  PermissionPromptPayload,
} from "../preload/shell-preload";
import brandMark from "./assets/icon.png";

type Tab = "accounts" | "downloads" | "permissions" | "settings";

type ConfirmAction =
  | { kind: "clearSession"; accountId: string; label: string }
  | { kind: "remove"; accountId: string; label: string };

const PREF_OPTIONS: { value: PermissionPreference; label: string }[] = [
  { value: "ask", label: "Ask each time" },
  { value: "allow", label: "Allow" },
  { value: "block", label: "Block" },
];

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
  const [prompt, setPrompt] = useState<PermissionPromptPayload | null>(null);
  const [closePrompt, setClosePrompt] = useState<ClosePromptPayload | null>(
    null,
  );
  const [closeRemember, setCloseRemember] = useState(true);
  const [badges, setBadges] = useState<AccountBadgeState[]>([]);
  const [diagnostics, setDiagnostics] =
    useState<NotificationDiagnostics | null>(null);
  const [downloads, setDownloads] = useState<DownloadUiRecord[]>([]);

  const refreshAccounts = useCallback(async () => {
    const result = await window.desktop.accounts.list();
    setAccounts(result.accounts);
    setSelectedAccountId(result.selectedAccountId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];
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
        unsubs.push(
          window.desktop.accounts.onChanged(() => {
            void refreshAccounts();
          }),
        );
        unsubs.push(
          window.desktop.permissions.onPrompt((payload) => {
            setPrompt(payload);
          }),
        );
        unsubs.push(
          window.desktop.onClosePrompt((payload) => {
            setClosePrompt(payload);
            setCloseRemember(true);
          }),
        );
        unsubs.push(
          window.desktop.notifications.onBadgesChanged((next) => {
            setBadges(next);
          }),
        );
        const initialDownloads = await window.desktop.downloads.list();
        if (!cancelled) setDownloads(initialDownloads);
        unsubs.push(
          window.desktop.downloads.onChanged((items) => {
            setDownloads(items);
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load shell");
        }
      }
    })();
    return () => {
      cancelled = true;
      for (const u of unsubs) u();
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

  async function patchSettings(
    patch: Partial<AppSettings>,
  ): Promise<void> {
    const next = await window.desktop.updateSettings(patch);
    setSettings(next);
  }

  async function refreshDiagnostics(): Promise<void> {
    const diag = await window.desktop.notifications.getDiagnostics();
    setDiagnostics(diag);
  }

  function badgeFor(accountId: string): AccountBadgeState | undefined {
    return badges.find((b) => b.accountId === accountId);
  }

  async function onPermissionPatch(
    accountId: string,
    patch: Parameters<typeof window.desktop.permissions.update>[1],
  ): Promise<void> {
    await run(() => window.desktop.permissions.update(accountId, patch));
  }

  async function respondPrompt(
    decision:
      | "allow-once"
      | "allow-always"
      | "block"
      | "deny"
      | "open"
      | "cancel",
  ): Promise<void> {
    if (!prompt) return;
    const requestId = prompt.requestId;
    setPrompt(null);
    await window.desktop.permissions.respondPrompt(requestId, decision);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand" aria-label="WATabs">
          <img className="brand-mark" src={brandMark} alt="" />
          <span className="brand-name">WATabs</span>
        </div>
        {prompt ? (
          <div className="prompt-box" role="dialog" aria-modal="true">
            <p>{prompt.message}</p>
            {prompt.kind === "http-external" ? (
              <div className="inline-form">
                <button type="button" onClick={() => void respondPrompt("open")}>
                  Open in browser
                </button>
                <button
                  type="button"
                  onClick={() => void respondPrompt("cancel")}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="inline-form">
                <button
                  type="button"
                  onClick={() => void respondPrompt("allow-once")}
                >
                  Allow once
                </button>
                <button
                  type="button"
                  onClick={() => void respondPrompt("allow-always")}
                >
                  Always allow
                </button>
                <button
                  type="button"
                  onClick={() => void respondPrompt("block")}
                >
                  Block
                </button>
                <button
                  type="button"
                  onClick={() => void respondPrompt("deny")}
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        ) : null}
        {closePrompt ? (
          <div className="prompt-box" role="dialog" aria-modal="true">
            <p>{closePrompt.message}</p>
            <label className="remember-row">
              <input
                type="checkbox"
                checked={closeRemember}
                onChange={(e) => setCloseRemember(e.target.checked)}
              />
              Remember my choice
            </label>
            <div className="inline-form">
              <button
                type="button"
                onClick={() => {
                  const id = closePrompt.requestId;
                  setClosePrompt(null);
                  void window.desktop.respondClosePrompt(
                    id,
                    "keep",
                    closeRemember,
                  );
                }}
              >
                Keep running
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = closePrompt.requestId;
                  setClosePrompt(null);
                  void window.desktop.respondClosePrompt(
                    id,
                    "quit",
                    closeRemember,
                  );
                }}
              >
                Quit
              </button>
            </div>
          </div>
        ) : null}
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
                  {badgeFor(account.id)?.attention ? (
                    <span className="pill badge-pill">
                      {badgeFor(account.id)?.count ?? "•"}
                    </span>
                  ) : null}
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
                  <>
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
                    <div className="perm-controls">
                      <label>
                        <span>Notifications</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void onPermissionPatch(account.id, {
                              notificationsEnabled: !account.notificationsEnabled,
                            })
                          }
                        >
                          {account.notificationsEnabled ? "On" : "Off"}
                        </button>
                      </label>
                      <label>
                        <span>Audio mute</span>
                        <button
                          type="button"
                          disabled={busy}
                          title="Mutes all audio from this account, including calls and media."
                          onClick={() =>
                            void run(() =>
                              window.desktop.accounts.setAudioMuted(
                                account.id,
                                !account.audioMuted,
                              ),
                            )
                          }
                        >
                          {account.audioMuted ? "Muted" : "On"}
                        </button>
                      </label>
                      <label>
                        <span>Badge</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void onPermissionPatch(account.id, {
                              unreadBadgeEnabled: !account.unreadBadgeEnabled,
                            })
                          }
                        >
                          {account.unreadBadgeEnabled ? "On" : "Off"}
                        </button>
                      </label>
                      <label>
                        <span>Mic</span>
                        <select
                          value={account.microphonePermission}
                          disabled={busy}
                          onChange={(e) =>
                            void onPermissionPatch(account.id, {
                              microphonePermission: e.target
                                .value as PermissionPreference,
                            })
                          }
                        >
                          {PREF_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Camera</span>
                        <select
                          value={account.cameraPermission}
                          disabled={busy}
                          onChange={(e) =>
                            void onPermissionPatch(account.id, {
                              cameraPermission: e.target
                                .value as PermissionPreference,
                            })
                          }
                        >
                          {PREF_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Display</span>
                        <select
                          value={account.displayCapturePermission}
                          disabled={busy}
                          onChange={(e) =>
                            void onPermissionPatch(account.id, {
                              displayCapturePermission: e.target
                                .value as PermissionPreference,
                            })
                          }
                        >
                          {PREF_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
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
          className={tab === "downloads" ? "nav-active" : ""}
          onClick={() => setTab("downloads")}
        >
          Downloads
        </button>
        <button
          type="button"
          className={tab === "permissions" ? "nav-active" : ""}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </button>
        <button
          type="button"
          className={tab === "settings" ? "nav-active" : ""}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
        {tab === "downloads" ? (
          <div className="settings sidebar-settings downloads-panel">
            <p className="hint">
              Files save to your Downloads folder (or the folder you choose).
              History is metadata only — clearing it never deletes files.
            </p>
            <button
              type="button"
              disabled={busy || downloads.length === 0}
              onClick={() =>
                void run(() => window.desktop.downloads.clearHistory())
              }
            >
              Clear history
            </button>
            <ul className="download-list">
              {downloads.length === 0 ? (
                <li className="hint">No downloads yet.</li>
              ) : (
                downloads.map((item) => (
                  <li key={item.id} className="download-item">
                    <div className="download-name">
                      {item.filename}
                      {item.isExecutable ? (
                        <span className="pill">Executable</span>
                      ) : null}
                    </div>
                    <div className="hint">
                      {item.state}
                      {item.totalBytes
                        ? ` · ${Math.min(
                            100,
                            Math.round(
                              (item.receivedBytes / item.totalBytes) * 100,
                            ),
                          )}%`
                        : ""}
                    </div>
                    <div className="account-actions">
                      {item.canPause ? (
                        <button
                          type="button"
                          onClick={() =>
                            void run(() =>
                              window.desktop.downloads.pause(item.id),
                            )
                          }
                        >
                          Pause
                        </button>
                      ) : null}
                      {item.canResume ? (
                        <button
                          type="button"
                          onClick={() =>
                            void run(() =>
                              window.desktop.downloads.resume(item.id),
                            )
                          }
                        >
                          Resume
                        </button>
                      ) : null}
                      {item.state === "progressing" ||
                      item.state === "starting" ||
                      item.state === "paused" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void run(() =>
                              window.desktop.downloads.cancel(item.id),
                            )
                          }
                        >
                          Cancel
                        </button>
                      ) : null}
                      {item.state === "completed" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void run(() =>
                                window.desktop.downloads.showInFolder(item.id),
                              )
                            }
                          >
                            Show in folder
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void run(() =>
                                window.desktop.downloads.open(item.id),
                              )
                            }
                          >
                            Open
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
        {tab === "permissions" ? (
          <div className="settings sidebar-settings">
            <p className="hint">
              Media access is limited to WhatsApp Web for the selected account.
              Display capture asks every time while set to Ask.
            </p>
            {!selectedAccountId ? (
              <p className="hint">Select an account to edit permissions.</p>
            ) : (
              (() => {
                const account = accounts.find((a) => a.id === selectedAccountId);
                if (!account) return null;
                return (
                  <div className="perm-panel">
                    <strong>{account.label}</strong>
                    <label>
                      <span>Notifications</span>
                      <button
                        type="button"
                        onClick={() =>
                          void onPermissionPatch(account.id, {
                            notificationsEnabled: !account.notificationsEnabled,
                          })
                        }
                      >
                        {account.notificationsEnabled ? "On" : "Off"}
                      </button>
                    </label>
                    <label>
                      <span>Microphone</span>
                      <select
                        value={account.microphonePermission}
                        onChange={(e) =>
                          void onPermissionPatch(account.id, {
                            microphonePermission: e.target
                              .value as PermissionPreference,
                          })
                        }
                      >
                        {PREF_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Camera</span>
                      <select
                        value={account.cameraPermission}
                        onChange={(e) =>
                          void onPermissionPatch(account.id, {
                            cameraPermission: e.target
                              .value as PermissionPreference,
                          })
                        }
                      >
                        {PREF_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Screen share</span>
                      <select
                        value={account.displayCapturePermission}
                        onChange={(e) =>
                          void onPermissionPatch(account.id, {
                            displayCapturePermission: e.target
                              .value as PermissionPreference,
                          })
                        }
                      >
                        {PREF_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })()
            )}
          </div>
        ) : null}
        {tab === "settings" ? (
          <div className="settings sidebar-settings">
            <div className="nav-label">Downloads</div>
            <div className="row">
              <span>Ask where to save</span>
              <button
                type="button"
                onClick={() =>
                  void patchSettings({
                    askWhereToSaveEachFile: !settings?.askWhereToSaveEachFile,
                  })
                }
              >
                {settings?.askWhereToSaveEachFile ? "On" : "Off"}
              </button>
            </div>
            <div className="row">
              <span>Save folder</span>
              <button
                type="button"
                onClick={() =>
                  void window.desktop.downloads.chooseDirectory().then(() =>
                    window.desktop.getSettings().then(setSettings),
                  )
                }
              >
                Choose…
              </button>
            </div>
            <div className="hint">
              {settings?.downloadDirectory ?? "System Downloads"}
            </div>
            <div className="row">
              <span>Warn on executables</span>
              <button
                type="button"
                onClick={() =>
                  void patchSettings({
                    warnOnExecutableDownload:
                      !settings?.warnOnExecutableDownload,
                  })
                }
              >
                {settings?.warnOnExecutableDownload ? "On" : "Off"}
              </button>
            </div>
            <div className="nav-label">Notifications</div>
            <div className="row">
              <span>Global notifications</span>
              <button
                type="button"
                onClick={() =>
                  void patchSettings({
                    notificationsGlobalEnabled:
                      !settings?.notificationsGlobalEnabled,
                  })
                }
              >
                {settings?.notificationsGlobalEnabled ? "On" : "Muted"}
              </button>
            </div>
            <div className="row">
              <span>Close to tray</span>
              <button
                type="button"
                onClick={() => {
                  const cur = settings?.closeToTray;
                  const next =
                    cur === null ? true : cur === true ? false : null;
                  void patchSettings({ closeToTray: next });
                }}
              >
                {settings?.closeToTray === null
                  ? "Ask"
                  : settings?.closeToTray
                    ? "Yes"
                    : "No"}
              </button>
            </div>
            <div className="row">
              <span>Start at login</span>
              <button
                type="button"
                onClick={() =>
                  void patchSettings({
                    startAtLogin: !settings?.startAtLogin,
                  })
                }
              >
                {settings?.startAtLogin ? "On" : "Off"}
              </button>
            </div>
            <div className="row">
              <span>Start hidden in tray</span>
              <button
                type="button"
                disabled={!settings?.startAtLogin}
                onClick={() =>
                  void patchSettings({
                    startHiddenInTray: !settings?.startHiddenInTray,
                  })
                }
              >
                {settings?.startHiddenInTray ? "On" : "Off"}
              </button>
            </div>
            <div className="row">
              <span>Launch minimized</span>
              <button
                type="button"
                onClick={() =>
                  void patchSettings({
                    launchMinimized: !settings?.launchMinimized,
                  })
                }
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
            <div className="nav-label">Notification diagnostics</div>
            <button
              type="button"
              onClick={() => void refreshDiagnostics()}
            >
              Refresh status
            </button>
            <button
              type="button"
              onClick={() =>
                void window.desktop.notifications.sendTest().then(() => {
                  void refreshDiagnostics();
                })
              }
            >
              Send test notification
            </button>
            {diagnostics ? (
              <div className="diag-box">
                <div>API supported: {String(diagnostics.notificationApiSupported)}</div>
                <div>Global: {String(diagnostics.notificationsGlobalEnabled)}</div>
                <div>In tray: {String(diagnostics.runningInTray)}</div>
                <div>View loaded: {String(diagnostics.selectedViewLoaded)}</div>
                <div>
                  Last test:{" "}
                  {diagnostics.lastTestOk == null
                    ? "—"
                    : diagnostics.lastTestOk
                      ? "ok"
                      : "fail"}
                </div>
              </div>
            ) : null}
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
