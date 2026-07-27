import path from "node:path";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const iconBase = path.resolve(__dirname, "assets/icon");

const windowsSign =
  process.env.WINDOWS_CODE_SIGN_CERT_PATH &&
  process.env.WINDOWS_CODE_SIGN_PASSWORD
    ? {
        certificateFile: process.env.WINDOWS_CODE_SIGN_CERT_PATH,
        certificatePassword: process.env.WINDOWS_CODE_SIGN_PASSWORD,
      }
    : undefined;

const nsisMaker = {
  name: "@electron-addons/electron-forge-maker-nsis",
  platforms: ["win32"] as string[],
  config: {
    ...(windowsSign
      ? {
          codesign: {
            certificateFile: windowsSign.certificateFile,
            certificatePassword: windowsSign.certificatePassword,
          },
        }
      : {}),
    // Emit latest.yml next to the installer for electron-updater (GitHub feed).
    updater: {
      url: "https://github.com/harshkolte01/WATabs",
      channel: "latest",
      updaterCacheDirName: "WATabs-updater",
    },
  },
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "WATabs",
    executableName: "WATabs",
    appBundleId: "com.multiwhatsapp.desktop",
    // Keep aligned with APP_USER_MODEL_ID in shared-types.
    icon: iconBase,
    extraResource: [path.resolve(__dirname, "assets")],
    win32metadata: {
      CompanyName: "WATabs",
      FileDescription: "WATabs",
      ProductName: "WATabs",
      InternalName: "WATabs",
      OriginalFilename: "WATabs.exe",
    },
    // Windows Authenticode only when CI secrets are present.
    // macOS Apple signing / notarization is intentionally out of scope.
    ...(windowsSign ? { windowsSign } : {}),
  },
  rebuildConfig: {},
  makers: [
    // NSIS assisted wizard (folder + desktop/Start Menu shortcuts).
    // Squirrel one-click cannot offer those pages.
    nsisMaker,
    new MakerZIP({}, ["darwin", "linux"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload/shell-preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
