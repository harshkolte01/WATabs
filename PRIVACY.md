# Privacy

WATabs is **local-first**. Account sessions and app settings stay on your computer. WATabs does not provide a cloud service for storing WhatsApp sessions or chats.

## What stays on your device

- WhatsApp Web session data in per-account Electron partitions
- Local labels, settings, download history metadata, and an optional PIN verifier
- Application logs with redaction rules (no message bodies)

## What WATabs does not do

- Read, index, or scrape WhatsApp messages or contacts
- Inject into or modify the WhatsApp Web interface for content access
- Sync sessions or chats to a WATabs cloud
- Export authenticated sessions or enable remote control
- Build an advertising identity graph

## Diagnostics

Support / diagnostic bundles are **opt-in** and **redacted**. You choose when to export them; they are not uploaded automatically.

## App lock

Optional PIN lock is a local UI barrier. It does **not** encrypt WhatsApp session files on disk.

## Protecting local sessions

For stronger protection of local browser-session files, enable OS disk encryption such as **BitLocker** (Windows) or **FileVault** (macOS).

## Updates

When auto-update is enabled, the app may contact GitHub Releases (or a configured feed) to check versions. That check does not include your chats or account contents.

WATabs is an independent project and is not affiliated with WhatsApp LLC or Meta Platforms, Inc.
