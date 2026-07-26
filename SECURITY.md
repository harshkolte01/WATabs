# Security Policy

WATabs is an Electron desktop container that stores authenticated WhatsApp Web sessions locally in isolated Chromium partitions. Security reports are handled privately so maintainers can investigate before public disclosure.

## Supported versions

WATabs is currently in **pre-1.0 / active development**. Security fixes are applied to the latest `main` branch and the newest published pre-release or release when available.

| Version | Supported |
| ------- | --------- |
| `main` / latest development builds | Yes |
| Latest published GitHub Release | Yes |
| Older releases | Best effort only |

## How to report a vulnerability

**Prefer GitHub private vulnerability reporting:**

[Report a vulnerability](https://github.com/harshkolte01/WATabs/security/advisories/new)

Do **not** open a public GitHub Issue for security vulnerabilities involving session isolation, authentication state, or local session data.

### What to include

- A clear description of the issue and its impact
- Steps to reproduce (minimal and self-contained)
- Affected OS, WATabs version or commit, and Electron version if known
- Proof-of-concept limited to a **throwaway / test** WhatsApp account when possible
- Suggested remediation if you have one

### What never to include

Never send or attach:

- Cookies or other session storage
- Authentication tokens
- QR codes (active or recently scanned)
- Phone numbers
- Personal messages, contacts, or chat content
- Session partition directories or exports
- Unredacted screenshots or diagnostic bundles containing sensitive data

## Scope

### In scope

- Session isolation bypass (one account accessing another account’s partition or storage)
- Injection into WhatsApp Web from the WATabs shell, preload, or renderer
- Privilege escalation from renderer / guest content to Node.js or host privileges
- Update signing / authenticity bypass (tampered updates accepted as legitimate)
- Weaknesses in navigation controls, permission handling, or partition boundaries that expose local sessions
- Issues that undermine `pnpm verify:no-injection` or Electron fuse hardening assumptions

### Out of scope

- Social engineering of WhatsApp accounts or end users
- Attacks against Meta / WhatsApp infrastructure, WhatsApp Web itself, or account takeover via WhatsApp’s own systems
- Issues that require physical access to an unlocked machine with an already-authenticated session (unless they demonstrate a WATabs-specific bypass beyond OS disk access)
- Feature requests, spam automation, or “how do I scrape messages” reports
- Reports that depend on disabling OS security features the user intentionally turned off

## Response timeline

We aim to:

| Stage | Target |
| ----- | ------ |
| Initial acknowledgement | Within **3 business days** |
| Triage / severity assessment | Within **7 business days** |
| Status update | At least every **14 days** while open |
| Fix or mitigation for confirmed high-impact issues | As soon as practical; coordinated disclosure after a fix is available |

Timelines may vary for pre-1.0 builds. We may request more information or a safer reproduction path before confirming.

## Local security checks

Before submitting security-related pull requests, run:

```bash
pnpm verify:no-injection
pnpm verify:fuses
```

- `verify:no-injection` — guards against shell/preload patterns that inject into WhatsApp Web
- `verify:fuses` — checks Electron fuse / hardening expectations for packaged builds

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations and service disruption
- Report privately through the channels above
- Do not exploit the issue beyond what is needed to demonstrate it
- Do not access, retain, or share real user messages, sessions, or credentials

Thank you for helping keep WATabs and its users safe.
