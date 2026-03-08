# birdclaw

`birdclaw` is a local-first X workspace for people who want their archive, inbox, DMs, search, and reply flows under their control.

Status: WIP. Usable local prototype. Not feature-complete. Expect schema churn, rough edges, and missing sync pieces.

## What It Is

- local web app + CLI
- one shared SQLite database for multiple X accounts
- archive import when you have a zip
- live-first path when you do not
- fast local search over tweets and DMs
- reply workflows for mentions and DMs
- account-scoped blocklist maintenance
- AI-ranked inbox for mixed mentions + DMs
- local storage in `~/.birdclaw` by default

## Why

X is noisy. The archive is valuable. The official surfaces are bad at triage.

`birdclaw` keeps the important parts local:

- your data in SQLite
- your media in a local cache
- your filters under your control
- your AI scoring layered on top, not trapped in a SaaS

## WIP / Reality Check

This repo is under active construction.

Current state:

- local app works
- CLI works
- archive import works
- DM triage works
- AI inbox works
- tests and Playwright exist

Still in flight:

- broader resumable live sync
- more complete transport coverage
- media fetch pipeline
- more import edge cases
- more polished multi-account UX

If you want a finished product today: this is not that yet.

## Current Features

- local-first SQLite store
- multi-account model from day 1
- TanStack Start web UI
- CLI with scriptable `--json`
- archive autodiscovery on macOS
- archive import for tweets, likes, DMs, profiles
- home timeline view
- mentions / replies view
- DM workspace
- blocklist view
- replied / unreplied filters
- DM filtering by sender follower count
- DM filtering by derived influence score
- sender bio visible in the DM UI
- local full-text search with FTS5
- AI inbox for mixed mentions + DMs
- OpenAI scoring hooks for low-signal filtering
- optional `xurl` transport for live reads / writes
- test-time live-write guard

## Screens

- `Home`: local timeline, reply-state filters
- `Mentions`: reply queue, fast triage
- `DMs`: sender bio, follower filters, influence filters, inline reply
- `Inbox`: AI-ranked mixed queue across mentions and DMs

## Storage

Default root:

```text
~/.birdclaw
```

Important files:

- SQLite DB: `~/.birdclaw/birdclaw.sqlite`
- media cache: under `~/.birdclaw`
- test Playwright home: `.playwright-home`

Override root:

```bash
export BIRDCLAW_HOME=/path/to/custom/root
```

## Requirements

- Node `24.12.0`
- `pnpm`
- macOS recommended for Spotlight archive discovery
- `xurl` optional, but useful for live transport
- OpenAI API key optional for inbox scoring

## Install

```bash
fnm use
pnpm install
```

## Run The App

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

## Quick Start

Initialize local state:

```bash
pnpm cli init
```

Check transport:

```bash
pnpm cli auth status --json
```

Find likely archives:

```bash
pnpm cli archive find --json
```

Import the newest archive automatically:

```bash
pnpm cli import archive --json
```

Or import a specific zip:

```bash
pnpm cli import archive ~/Downloads/twitter-archive-2025.zip --json
```

Hydrate imported profiles from live X metadata:

```bash
pnpm cli import hydrate-profiles --json
```

Maintain the blocklist:

```bash
pnpm cli blocks list --json
pnpm cli blocks add @spamhandle --account acct_primary --json
pnpm cli blocks remove @spamhandle --account acct_primary --json
```

## CLI Examples

### Status / setup

```bash
pnpm cli init
pnpm cli auth status
pnpm cli db stats --json
```

### Search tweets

```bash
pnpm cli search tweets "local-first" --json
pnpm cli search tweets "sync engine" --limit 20 --json
```

### Search DMs

```bash
pnpm cli search dms "prototype" --json
pnpm cli search dms "layout" --min-followers 1000 --min-influence-score 120 --sort influence --json
pnpm cli dms list --unreplied --min-followers 500 --min-influence-score 90 --sort influence --json
```

### AI inbox

```bash
pnpm cli inbox --json
pnpm cli inbox --kind dms --limit 10 --json
pnpm cli inbox --score --hide-low-signal --limit 8 --json
```

### Blocklist

```bash
pnpm cli blocks list --account acct_primary --json
pnpm cli blocks add @amelia --account acct_primary --json
pnpm cli blocks remove @amelia --account acct_primary --json
```

### Compose / reply

```bash
pnpm cli compose post "Ship local software."
pnpm cli compose reply tweet_004 "On it."
pnpm cli compose dm dm_003 "Send it over."
```

## Web UI Workflow

Typical loop:

1. import archive
2. open `Home` for reading
3. open `Mentions` for reply triage
4. open `DMs` to filter by sender influence
5. open `Inbox` to let AI push high-signal items to the top

## AI / OpenAI

`birdclaw` has an AI inbox layer for ranking mentions and DMs.

Intent:

- score likely high-signal items
- suppress obvious low-signal noise
- keep the human in control

OpenAI key:

- sourced from your shell environment
- Peter’s local setup already keeps it in `.profile`

Example:

```bash
pnpm cli inbox --score --limit 5 --json
```

## Live Transport

Preferred live transport today:

- `xurl` first

Without `xurl`, `birdclaw` still works in local/archive mode.

Check status:

```bash
pnpm cli auth status --json
```

## Safety

- tests disable live writes
- CI disables live writes
- app is local-only by default
- block/unblock updates the local blocklist even when live transport is unavailable

Still: this is WIP. Treat live write flows with care.

## Testing

Run everything:

```bash
fnm exec --using 24.12.0 pnpm check
fnm exec --using 24.12.0 pnpm coverage
fnm exec --using 24.12.0 pnpm build
fnm exec --using 24.12.0 pnpm e2e
```

Current quality bar:

- coverage above `80%`
- Playwright coverage for core flows

## CI

GitHub Actions runs:

- `pnpm check`
- `pnpm coverage`
- `pnpm build`
- `pnpm e2e`

See [ci.yml](/Users/steipete/Projects/birdclaw/.github/workflows/ci.yml).

## Docs

- [spec.md](/Users/steipete/Projects/birdclaw/docs/spec.md)
- [cli.md](/Users/steipete/Projects/birdclaw/docs/cli.md)
- [data-architecture.md](/Users/steipete/Projects/birdclaw/docs/data-architecture.md)

## Repo Notes

- UI is intentionally minimal and content-first
- SQLite is the canonical local truth
- archive import and no-archive sync should converge on the same model
- agents should be able to query local history with narrow filters and stable JSON
