import { useEffect, useState } from "react";
import type { AppInfo, AppSettings } from "@multi-whatsapp/shared-types";

type Tab = "home" | "settings";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [appInfo, appSettings] = await Promise.all([
          window.desktop.getAppInfo(),
          window.desktop.getSettings(),
        ]);
        if (!cancelled) {
          setInfo(appInfo);
          setSettings(appSettings);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load shell");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggleLaunchMinimized(): Promise<void> {
    if (!settings) return;
    const next = await window.desktop.updateSettings({
      launchMinimized: !settings.launchMinimized,
    });
    setSettings(next);
  }

  async function onResetWindow(): Promise<void> {
    await window.desktop.resetWindowState();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Multi Account Desktop</div>
        <div className="nav-label">Workspace</div>
        <button type="button" onClick={() => setTab("home")}>
          Home
        </button>
        <button type="button" onClick={() => setTab("settings")}>
          Settings
        </button>
        <div className="meta">
          Local shell only. WhatsApp accounts arrive in a later phase.
          {info ? (
            <>
              <br />
              Electron {info.electron}
            </>
          ) : null}
        </div>
      </aside>
      <main className="main">
        <header className="header">
          <h1>{tab === "home" ? "Home" : "Settings"}</h1>
        </header>
        <section className="content">
          {error ? <p className="error">{error}</p> : null}
          {tab === "home" ? (
            <div className="empty">
              <strong>No accounts yet</strong>
              <p>
                This Phase 1 foundation runs a trusted local shell with no remote
                content. Multi-account WhatsApp Web sessions will be added in
                Phase 2.
              </p>
            </div>
          ) : (
            <div className="settings">
              <div className="row">
                <span>Launch minimized</span>
                <button type="button" onClick={() => void onToggleLaunchMinimized()}>
                  {settings?.launchMinimized ? "On" : "Off"}
                </button>
              </div>
              <div className="row">
                <span>Window state</span>
                <button type="button" onClick={() => void onResetWindow()}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
