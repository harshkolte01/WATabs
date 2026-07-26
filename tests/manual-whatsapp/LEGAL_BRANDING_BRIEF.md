# Legal and Branding Review Brief — Phase 0

**Purpose:** Obtain acceptance of the intended distribution model before Phase 1 product scaffolding.  
**Status:** Pending reviewer sign-off (record outcome in [RESULTS.md](RESULTS.md)).

## Intended product

A **local multi-account browser workspace** that opens the official WhatsApp Web interface (`https://web.whatsapp.com`) in isolated Chromium session partitions inside an Electron desktop application.

The application:

- Does **not** implement a WhatsApp client, messaging API, bot, scraper, CRM, or automation layer
- Does **not** read, modify, or inject into the WhatsApp DOM
- Provides only browser-container features: multiple isolated profiles, window chrome, OS permissions, downloads, notifications routing at the account level, local settings

## Required positioning language

**Use:**

> A local multi-account browser workspace that opens the official WhatsApp Web interface in isolated sessions.

**Do not use:**

- Official WhatsApp desktop client
- WhatsApp partner / WhatsApp-approved
- Built with WhatsApp
- WhatsApp API
- WhatsApp automation platform
- WhatsApp CRM
- WhatsApp clone

## Suggested non-affiliation disclaimer

> This application is an independent browser container and is not affiliated with, endorsed by, sponsored by, or officially connected with WhatsApp LLC or Meta Platforms, Inc. WhatsApp and related marks belong to their respective owners.

## Branding requirements (for later productization)

- Independent product name (WhatsApp must not be the primary application name)
- Do not copy the WhatsApp logo or trade dress
- Visible non-affiliation statement in-app and in marketing
- Link to WhatsApp’s official site and terms where appropriate
- Follow applicable Meta/WhatsApp brand guidelines
- Legal review before third-party trademarks appear in marketing, screenshots, store listings, or installer assets

## Distribution model

- Local desktop application for Windows and macOS
- Loads the public official website; no unofficial protocol reverse engineering
- No cloud sync or export/import of authenticated session partitions
- Compatibility is controlled by WhatsApp and may change without notice

## Compatibility warning (must appear in user-facing terms/privacy)

- WhatsApp controls the website and its features
- WhatsApp may change or discontinue functionality
- The application cannot guarantee continued compatibility
- Account restrictions or enforcement by WhatsApp are outside the application’s control
- Users remain responsible for compliance with WhatsApp’s terms

## Reviewer decision

| Field | Value |
|-------|-------|
| Reviewer name | |
| Date | |
| Decision | Accept / Reject / Accept with conditions |
| Conditions (if any) | |
| Signature / acknowledgment | |

If rejected, Phase 0 verdict is **NO-GO** — do not start Phase 1 as if the gate passed.

## Engineering acknowledgment (not a legal opinion)

| Field | Value |
|-------|-------|
| Prepared | 2026-07-26 |
| Scope | Positioning text above matches `implementation_plan.md` §3 for the Phase 0 distribution model |
| Formal counsel sign-off | **Still required** before public commercial distribution (production release gate) |

Record the reviewer’s Accept/Reject in [RESULTS.md](RESULTS.md).
