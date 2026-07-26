/**
 * WATabs site config — change RELEASES_URL when the GitHub repo moves.
 */
const CONFIG = {
  releasesUrl: "https://github.com/harshkolte01/WATabs/releases/latest",
  repoUrl: "https://github.com/harshkolte01/WATabs",
  statusUrl: "./phase7-status.json",
};

const STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

function wireDownloadLinks() {
  document.querySelectorAll("[data-download]").forEach((el) => {
    el.setAttribute("href", CONFIG.releasesUrl);
  });
  document.querySelectorAll("[data-repo]").forEach((el) => {
    el.setAttribute("href", CONFIG.repoUrl);
  });
}

function setBanner(autoUpdateLive) {
  const banner = document.querySelector("[data-update-banner]");
  if (!banner) return;
  if (autoUpdateLive) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.textContent =
    "Auto-update is not available yet — install new releases manually from GitHub.";
}

function applyStepStatuses(steps) {
  const byId = new Map(steps.map((s) => [String(s.id), s.status]));
  let done = 0;
  document.querySelectorAll("[data-step]").forEach((el) => {
    const id = el.getAttribute("data-step");
    const status = byId.get(id) || "not_started";
    if (status === "done") done += 1;
    el.dataset.status = status;
    const badge = el.querySelector("[data-status-badge]");
    if (badge) badge.textContent = STATUS_LABELS[status] || status;
  });
  const progress = document.querySelector("[data-phase7-progress]");
  if (progress) {
    const total = document.querySelectorAll("[data-step]").length || 8;
    progress.textContent = `${done} / ${total} steps done`;
  }
}

async function loadPhase7Status() {
  if (!document.querySelector("[data-step]")) {
    setBanner(false);
    return;
  }
  try {
    const res = await fetch(CONFIG.statusUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    setBanner(Boolean(data.autoUpdateLive));
    if (Array.isArray(data.steps)) applyStepStatuses(data.steps);
  } catch {
    setBanner(false);
  }
}

function markCurrentNav() {
  const path = (location.pathname.split("/").pop() || "index.html").replace(
    /\.html$/,
    "",
  );
  const key = path === "" || path === "index" ? "index" : path;
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const nav = a.getAttribute("data-nav");
    if (nav === key) a.setAttribute("aria-current", "page");
  });
}

wireDownloadLinks();
markCurrentNav();
void loadPhase7Status();
