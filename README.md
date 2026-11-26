# Coarena — AI Agent Workspace

A real, installable AI agent workspace. Chat with specialist agents that browse the web,
generate PDFs, run automations on a schedule and remember what matters — all in an
Apple-style Liquid Glass interface.

**Provider:** the [Coarena Free Model API](https://coarena.ai) — one OpenAI-compatible key
powers every agent.

```text
OpenAI-compatible base URL:  https://coarena.ai/api/v1
Anthropic-compatible base:   https://coarena.ai/api
Chat completions:            POST https://coarena.ai/api/v1/chat/completions
Models:                      GET  https://coarena.ai/api/v1/models
Reply rating / feedback:     POST https://coarena.ai/api/v1/feedback
```

## What's inside

| Surface | What it does |
| --- | --- |
| **Sidebar** | Collapsible glass rail: brand + theme toggle, live search, new-agent button, all navigation sections, agent roster with real-time status dots, and a profile card that opens the account menu. |
| **Chat** | Streaming agent conversations with tool steps (search, browse, click, type, PDF, WhatsApp, memory, delegate), reasoning disclosure, follow-up suggestions, voice input, attachments, markdown/code preview, PDF export and thumbs-up/down feedback. |
| **Computer & Browser** | Live browser screen with a real URL bar, click-to-takeover with ripple feedback (local Playwright server), quick-run task box, session history cards, and a resizable split panel beside the chat on wide screens. |
| **Brain** | Pinned knowledge documents, visa checklists and agent memory — automatically recalled into prompts, with an animated memory graph. |
| **Automations** | Visual step-by-step multi-agent workflow runner with live status and outputs. |
| **Routines** | Scheduled background runs on custom intervals. |
| **Connections** | Single-key Coarena setup (with live model refresh), WhatsApp Cloud API, local Playwright server and optional extra providers. |
| **Settings / Profile** | Google-Workspace-style account menu: theme, language, PWA install, keyboard shortcuts, data backup and reset. |

## PWA

- `viewport-fit=cover` with `maximum-scale=1.0, user-scalable=no` — the layout never
  pinch-zooms or shifts on mobile.
- Installable on iOS, Android, iPad and desktop; offline app shell via `public/sw.js`.
- Maskable + standard icons, app shortcuts, and safe-area aware fixed bars.

## Develop

```sh
bun install          # or npm install
bun run dev          # Vite + TanStack Start
bun run build        # production build
bun run test         # vitest
```

### Sandbox environment (Base44)

The Base44 sandbox runs this repo from source in one Docker service. The Compose file,
healthcheck and setup notes live in the **environment repository**, not in this repo — the
steps below are what that configuration does, so you can replicate it locally.

| Step | What happens |
| --- | --- |
| Runtime | `oven/bun:1` (matches the pinned `bun.lock`; `bunfig.toml` enforces a 24h release age) |
| Source | repository bind-mounted at `/workspace`, so edits hot-reload |
| Install | `bun install --frozen-lockfile` on container start; `node_modules` and the bun cache live in named volumes |
| Dev server | `bun run dev -- --host 0.0.0.0 --port 3000 --strictPort` |
| Entry point | host port `3000` |
| Health check | `GET /` from inside the container via bun's `fetch` |

Reproduce it with plain Bun when Docker is not available:

```sh
bun install --frozen-lockfile
bun run dev -- --host 0.0.0.0 --port 3000
```

Environment variables come from `.env` (committed; Vite loads it in dev). Nothing else is
required to boot:

| Variable | Purpose |
| --- | --- |
| `COARENA_API_KEY` | server-only Coarena workspace key, resolved inside the server function (no `VITE_` prefix, never bundled) |
| `VITE_COARENA_MODEL` | default model id shown in the composer |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Supabase project URL for optional auth sessions |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key for the same project |

To replace the Coarena key without editing `.env`, store it as a Base44 secret and add
`/run/base44/app.env` as the last `env_file:` entry for the `web` service — secrets there
override the committed defaults.

`bun run test` includes `src/test/environment.test.ts`, which asserts these variables are
present and resolve the same way the server reads them (presence and shape only — values are
never printed).

The optional Playwright computer (`server/index.mjs`, port `8787`) is not started by the
sandbox; the Computer panel falls back to its cloud preview without it.

### Configure the Coarena key

The workspace key lives in `.env` as **`COARENA_API_KEY`** (no `VITE_` prefix). It is read
**inside a server function** (`src/grok/lib/coarenaServer.ts`) and handed to the browser at
runtime, so it is **never compiled into the client bundle**. Verified: the built
`.output/public` contains no key material.

Resolution order for every request:

1. a key typed in **Connections → Coarena Free Model API** (stored in local storage, always wins), else
2. `COARENA_API_KEY` from the environment / `.env` (shows as **Live · workspace key**), else
3. the request fails with a clear "add a key" message and the agent is paused.

### API keys in the app

| Surface | What it does |
| --- | --- |
| Connections → Coarena | paste/replace the key, **Test** it, refresh the live model list, make Coarena the provider for every agent |
| Connections → WhatsApp | one-tap `wa.me` connect, or a Cloud API token + phone-number ID with a **Test** check |
| Connections → Browser / Google Cloud | optional `AIza…` key for browser automations and Google APIs, with a live **Test** check |
| Settings → Provider keys | per-provider keys for xAI / OpenAI / DeepSeek / Mistral / Gemini |

### The 8 built-in agents

| Agent | Job |
| --- | --- |
| **Coarena** | Chief of Staff — plans, delegates, coordinates the team |
| **Browser Agent** | browser-use with Playwright, live preview |
| **Visa Expert** | refusals, appeals, reapplication strategy |
| **Legal Docs Expert** | contracts and legal drafting |
| **PDF Generator** | documents → PDF |
| **App Builder** | idea → working web app |
| **Researcher** | deep research with citations |
| **Portal Verifier** | visa/portal verification, browser automation, **pauses for human approval** on terms, OTP, captcha and final submit, then summary + PDF report |

`Portal Verifier` ships with the build (`DEFAULT_BOTS`) and a store migration (v5 → v6) adds it to
existing workspaces automatically.

### Optional: real browser control (local Playwright computer)

Interactive click / type / scroll needs the companion server shipped in `server/index.mjs`:

```sh
npm i -D playwright
npx playwright install chromium
node server/index.mjs          # → http://localhost:8787
```

The app detects it automatically (`/health` every 15 s), switches the Computer panel from
**Cloud preview** to **Playwright · live**, and enables click-to-takeover. Without it the
panel falls back to a cloud reader + screenshot preview, and any failed step can be retried
in place.

## Tech

TanStack Start · React 19 · Zustand (persisted) · Tailwind CSS v4 · jsPDF · Lucide.
