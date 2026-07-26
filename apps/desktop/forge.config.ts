import path from "node:path";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
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

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "WATabs",
    executableName: "WATabs",
    appBundleId: "com.multiwhatsapp.desktop",
    // Keep aligned with APP_USER_MODEL_ID in shared-types.
    icon: iconBase,
    extraResource: [path.resolve(__dirname, "assets")],
    // Windows Authenticode only when CI secrets are present.
    // macOS Apple signing / notarization is intentionally out of scope.
    ...(windowsSign ? { windowsSign } : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "WATabs",
      // Required by Squirrel/NuGet nuspec (package.json "author" alone can be missed in monorepos).
      authors: "WATabs",
      description:
        "WATabs — multi-account WhatsApp Web desktop workspace",
      setupIcon: `${iconBase}.ico`,
      // Sign Setup.exe + app at make time (Forge Windows signing guide).
      ...(windowsSign
        ? {
            certificateFile: windowsSign.certificateFile,
            certificatePassword: windowsSign.certificatePassword,
            windowsSign,
          }
        : {}),
    }),
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
