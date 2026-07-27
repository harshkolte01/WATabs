/**
 * WATabs site — config, nav, GitHub Releases download wiring.
 * Fetches latest release in-browser (CORS-friendly); falls back to /releases/latest.
 */
const CONFIG = {
  owner: "harshkolte01",
  repo: "WATabs",
  cacheKey: "watabs:latest-release:v2",
  cacheTtlMs: 10 * 60 * 1000,
};

const releasesPageUrl = () =>
  `https://github.com/${CONFIG.owner}/${CONFIG.repo}/releases/latest`;
const repoUrl = () => `https://github.com/${CONFIG.owner}/${CONFIG.repo}`;
const apiLatestUrl = () =>
  `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/releases/latest`;

function detectPlatform() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  if (/Mac|iPhone|iPad|iPod/i.test(ua) || /Mac/i.test(platform)) return "mac";
  if (/Win/i.test(ua) || /Win/i.test(platform)) return "win";
  return "other";
}

function isWinSetup(name) {
  // NSIS: WATabs-0.1.4-Setup.exe; legacy Squirrel: WATabs-0.1.2.Setup.exe
  return (
    /^WATabs/i.test(name) &&
    /\.exe$/i.test(name) &&
    (/Setup/i.test(name) || /setup/i.test(name)) &&
    !/\.blockmap$/i.test(name)
  );
}

function isMacZip(name) {
  return /^WATabs/i.test(name) && /darwin/i.test(name) && /\.zip$/i.test(name);
}

function isJunk(name) {
  return (
    /\.nupkg$/i.test(name) ||
    /\.blockmap$/i.test(name) ||
    /^RELEASES$/i.test(name) ||
    /^latest\.ya?ml$/i.test(name) ||
    /^sbom\.json$/i.test(name) ||
    /^SHA256SUMS/i.test(name) ||
    /^WATabs\.exe$/i.test(name)
  );
}

function pickAsset(assets, platform) {
  const list = (assets || []).filter((a) => a?.name && !isJunk(a.name));
  if (platform === "win") {
    return (
      list.find((a) => /WATabs-[\d.]+-Setup\.exe$/i.test(a.name)) ||
      list.find((a) => isWinSetup(a.name)) ||
      null
    );
  }
  if (platform === "mac") {
    const zips = list.filter((a) => isMacZip(a.name));
    if (!zips.length) return null;
    const arm = zips.find((a) => /arm64|aarch64/i.test(a.name));
    return arm || zips[0];
  }
  return list.find((a) => isWinSetup(a.name)) || list[0] || null;
}

function formatMb(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

async function fetchLatestRelease() {
  try {
    const raw = sessionStorage.getItem(CONFIG.cacheKey);
    if (raw) {
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at < CONFIG.cacheTtlMs) return data;
    }
  } catch {
    /* ignore cache */
  }

  const res = await fetch(apiLatestUrl(), {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 403 || res.status === 429 || res.status === 404) {
    throw new Error(`release-${res.status}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  try {
    sessionStorage.setItem(
      CONFIG.cacheKey,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* quota */
  }
  return data;
}

function wireStaticLinks() {
  const fallback = releasesPageUrl();
  document.querySelectorAll("[data-download]").forEach((el) => {
    if (!el.getAttribute("href") || el.getAttribute("href") === "#") {
      el.setAttribute("href", fallback);
    }
  });
  document.querySelectorAll("[data-repo]").forEach((el) => {
    el.setAttribute("href", repoUrl());
  });
  document.querySelectorAll("[data-releases]").forEach((el) => {
    el.setAttribute("href", fallback);
  });
}

async function wireDownloadButtons() {
  const platform = detectPlatform();
  const buttons = [...document.querySelectorAll("[data-download]")];
  const versionEls = document.querySelectorAll("[data-version]");
  const statusEls = document.querySelectorAll("[data-download-status]");

  const setStatus = (text) => {
    statusEls.forEach((el) => {
      el.textContent = text;
    });
  };

  buttons.forEach((btn) => {
    btn.setAttribute("href", releasesPageUrl());
    btn.setAttribute("aria-busy", "true");
  });
  setStatus("Checking latest release…");

  try {
    const release = await fetchLatestRelease();
    const tag = release.tag_name || release.name || "";
    const asset = pickAsset(release.assets, platform);
    const size = asset ? formatMb(asset.size) : null;

    versionEls.forEach((el) => {
      if (tag) el.textContent = tag;
    });

    if (asset?.browser_download_url) {
      const label =
        platform === "win"
          ? `Download for Windows${tag ? ` · ${tag}` : ""}`
          : platform === "mac"
            ? `Download for Mac${tag ? ` · ${tag}` : ""}`
            : `Download${tag ? ` · ${tag}` : ""}`;

      buttons.forEach((btn) => {
        btn.href = asset.browser_download_url;
        if (btn.dataset.downloadLabel !== "keep") {
          btn.textContent = label;
        }
      });
      setStatus(
        [asset.name, size].filter(Boolean).join(" · ") +
          (platform === "other"
            ? " · Windows build linked — see all platforms on GitHub"
            : ""),
      );
    } else {
      buttons.forEach((btn) => {
        btn.href = release.html_url || releasesPageUrl();
        if (btn.dataset.downloadLabel !== "keep") {
          btn.textContent = "View releases";
        }
      });
      setStatus(
        platform === "mac"
          ? "No Mac build matched — open Releases for available assets."
          : "Installer not in latest release — open Releases.",
      );
    }
  } catch {
    buttons.forEach((btn) => {
      btn.href = releasesPageUrl();
      if (btn.dataset.downloadLabel !== "keep") {
        btn.textContent = "Download from GitHub";
      }
    });
    setStatus("Couldn’t reach GitHub — opening Releases instead.");
  } finally {
    buttons.forEach((btn) => btn.removeAttribute("aria-busy"));
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

function initReveal() {
  const nodes = document.querySelectorAll("[data-reveal]");
  if (
    !nodes.length ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    nodes.forEach((n) => n.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  nodes.forEach((n) => io.observe(n));
}

wireStaticLinks();
markCurrentNav();
initReveal();
void wireDownloadButtons();
