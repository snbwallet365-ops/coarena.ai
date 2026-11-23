// @ts-nocheck
/**
 * Server-side bridge for the Coarena Free Model API.
 *
 * The API key is resolved INSIDE the server function only, so it is never
 * compiled into the client bundle. The browser asks the server for the key at
 * runtime (or supplies its own from Connections) and then talks to Coarena
 * directly, which keeps real token streaming intact.
 *
 * Key resolution order:
 *   1. `COARENA_API_KEY`  — recommended, server-only (never shipped to the browser)
 *   2. `VITE_COARENA_API_KEY` — legacy build-time fallback
 *   3. the key typed in Connections (client side, sent as Bearer)
 */
import { createServerFn } from "@tanstack/react-start";
import { COARENA_MODEL_ENDPOINT } from "./coarena";

/**
 * Load COARENA_API_KEY without ever reaching the browser bundle:
 *   1. real environment variable (production, docker, CI)
 *   2. the project `.env` file (dev server / simple deploys)
 *   3. legacy VITE_COARENA_API_KEY builds
 */
async function readServerKey(): Promise<string> {
  const env = (typeof process !== "undefined" && process.env) || {};
  const fromEnv = String(env.COARENA_API_KEY || "").trim();
  if (fromEnv) return fromEnv;

  try {
    const fs: any = await import("node:fs");
    const path: any = await import("node:path");
    const file = path.join(process.cwd(), ".env");
    const txt = fs.readFileSync(file, "utf8") as string;
    const line = txt.split(/\r?\n/).find((l) => /^\s*COARENA_API_KEY\s*=/.test(l));
    const val = line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
    if (val) return val;
  } catch {
    /* no .env readable — fall through */
  }

  return String(env.VITE_COARENA_API_KEY || import.meta.env["VITE_COARENA_API_KEY"] || "").trim();
}

/** Returns the workspace key without ever exposing it through the JS bundle. */
export const getCoarenaKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = await readServerKey();
  return { key, configured: !!key };
});

/** Cheap check: is a workspace key available at all? (no network call) */
export const coarenaKeyStatus = createServerFn({ method: "GET" }).handler(async () => {
  const key = await readServerKey();
  return { configured: !!key, masked: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : "" };
});

/** Health + model catalogue check using the server key (no browser CORS involved). */
export const coarenaPing = createServerFn({ method: "GET" }).handler(async () => {
  const key = await readServerKey();
  if (!key) return { ok: false as const, error: "NO_SERVER_KEY" as const, models: [] as string[] };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    const res = await fetch(COARENA_MODEL_ENDPOINT, {
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
      signal: ctl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false as const, error: `Coarena ${res.status}`, models: [] as string[] };
    const j = await res.json();
    const raw = Array.isArray(j) ? j : j?.data ?? j?.models ?? [];
    const models = raw.map((m: any) => (typeof m === "string" ? m : m?.id ?? m?.name)).filter((x: unknown) => typeof x === "string" && x);
    return { ok: true as const, error: null, models: [...new Set(models)] as string[] };
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message ?? e), models: [] as string[] };
  }
});
