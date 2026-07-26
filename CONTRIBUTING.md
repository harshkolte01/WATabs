# Contributing to WATabs

Thanks for your interest in contributing. WATabs is an open-source multi-account WhatsApp Web desktop container built with Electron. Contributions that improve security, reliability, accessibility, and documentation are especially welcome.

## Prerequisites

- **Node.js 20+** (LTS)
- **pnpm** 10+
- **Windows or macOS**
- Git

Linux packaging support is planned later; development today targets Windows and macOS.

## Setup

```bash
git clone https://github.com/harshkolte01/WATabs.git
cd WATabs
pnpm install
pnpm start
```

Useful checks:

```bash
pnpm typecheck
pnpm test:unit
pnpm verify:no-injection
```

Additional security packaging checks (after `pnpm package` when relevant):

```bash
pnpm verify:fuses
```

`pnpm dev` is an alias for `pnpm start`.

## Pull request guidelines

1. Search existing issues and PRs before starting large work.
2. Keep changes **focused** — one concern per PR when practical.
3. Add or update **tests** when behavior changes and tests apply.
4. Run `pnpm typecheck`, `pnpm test:unit`, and `pnpm verify:no-injection` before opening the PR.
5. Prefer clear commit messages that explain *why*.
6. Do not include secrets, real session data, personal messages, phone numbers, or QR codes in commits, screenshots, or fixtures.

## Hard bans

Do **not** introduce or propose:

- Message automation, bulk messaging, scheduled sends, or auto-replies
- Scraping of chats, contacts, or WhatsApp Web DOM content
- DOM / JavaScript injection into WhatsApp Web
- Session export, import, sync, or remote control of authenticated partitions
- Misuse of WhatsApp / Meta branding, logos, or claims of official affiliation

WATabs is a local browser container for the official WhatsApp Web UI — not a messaging API or automation platform.

## Good first contributions

- Windows and macOS testing and bug reports
- Electron security improvements
- Accessibility improvements
- UI refinements
- Download reliability
- Notification testing
- Documentation
- Localization
- Automated testing

## Code of conduct (light)

Be respectful and constructive in issues, discussions, and reviews. Assume good intent, keep feedback about the code, and avoid harassment or personal attacks. Maintainers may close or reject contributions that violate the hard bans above or that are hostile to collaborators.

## Questions

- [GitHub Issues](https://github.com/harshkolte01/WATabs/issues) for reproducible bugs
- [GitHub Discussions](https://github.com/harshkolte01/WATabs/discussions) for ideas and questions
- [`SECURITY.md`](./SECURITY.md) for vulnerability reports (private disclosure only)
