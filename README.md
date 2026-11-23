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

### Configure the Coarena key

The key is read from `VITE_COARENA_API_KEY` in `.env` (already set for this workspace).
You can also change it at runtime in **Connections → Coarena Free Model API**. Keys are
stored in the browser's local storage and are never included in exported backups.

> Because Coarena is a client-side PWA, any key shipped in `VITE_*` is visible in the
> browser. Use a publishable/free-tier key, or proxy requests through your own server.

### Optional: real browser control

Interactive click/type control needs the companion Playwright server. In **Connections →
Playwright browser server** you'll find the exact command and the server URL. Without it,
browsing falls back to a cloud reader + screenshot preview.

## Tech

TanStack Start · React 19 · Zustand (persisted) · Tailwind CSS v4 · jsPDF · Lucide.
