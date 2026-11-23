// @ts-nocheck
import type { Provider } from "./store";
import { COARENA_CHAT_ENDPOINT, COARENA_FALLBACK_MODELS, COARENA_MODEL_ENDPOINT, COARENA_FEEDBACK_ENDPOINT, type CoarenaFeedback } from "./coarena";

export interface ChatMsg { role: "system" | "user" | "assistant"; content: string }

// ---------------- Key resolution ----------------
let serverKeyCache: string | null = null;

/**
 * Resolve the Coarena key for a request:
 *   1. a key the user typed in Connections (always wins), else
 *   2. the workspace key held on the server (never shipped to the browser bundle).
 * Returns "" when neither is available so callers can show a clear error.
 */
export async function resolveCoarenaKey(apiKey?: string | null): Promise<string> {
  const own = (apiKey ?? "").trim();
  if (own) return own;
  if (serverKeyCache !== null) return serverKeyCache;
  try {
    const mod: any = await import("./coarenaServer");
    const r = await mod.getCoarenaKey();
    serverKeyCache = String(r?.key ?? "").trim();
  } catch {
    serverKeyCache = "";
  }
  return serverKeyCache;
}

/** "connections" when the user supplied their own key, otherwise "server". */
export function coarenaKeySource(apiKey?: string | null): "connections" | "server" | "none" {
  if ((apiKey ?? "").trim()) return "connections";
  if (serverKeyCache) return "server";
  return "none";
}

let serverConfigured: boolean | null = null;

/** True when the server holds a workspace key (no network round-trip). */
export async function hasServerCoarenaKey(): Promise<boolean> {
  if (serverConfigured !== null) return serverConfigured;
  try {
    const mod: any = await import("./coarenaServer");
    const r = await mod.coarenaKeyStatus();
    serverConfigured = !!r?.configured;
  } catch { serverConfigured = false; }
  return serverConfigured;
}

/** Ask the server to verify the Coarena key and list models (no browser CORS). */
export async function pingCoarenaServer(): Promise<{ ok: boolean; error?: string; models?: string[] }> {
  try {
    const mod: any = await import("./coarenaServer");
    return await mod.coarenaPing();
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

const ENDPOINT: Record<Exclude<Provider, "gemini">, string> = {
  coarena: COARENA_CHAT_ENDPOINT,
  openai: "https://api.openai.com/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
};

interface Opts {
  provider: Provider; model: string; apiKey: string; messages: ChatMsg[];
  agentId?: string; temperature?: number; signal?: AbortSignal;
  proxy?: string | null;
  onToken?: (t: string) => void; onReasoning?: (t: string) => void;
}

async function doFetch(url: string, init: RequestInit, proxy?: string | null) {
  if (proxy) {
    return fetch(`${proxy.replace(/\/$/, "")}/proxy`, {
      method: "POST", signal: init.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method: init.method, headers: init.headers, body: init.body }),
    });
  }
  return fetch(url, init);
}

async function readError(res: Response) {
  const txt = await res.text().catch(() => "");
  try {
    const j = JSON.parse(txt);
    const m = j?.error?.message || j?.message || j?.detail || j?.error || txt;
    return typeof m === "string" ? m : JSON.stringify(m);
  } catch { return txt || res.statusText; }
}

async function* sseLines(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const l of lines) if (l.startsWith("data:")) yield l.slice(5).trim();
  }
  if (buf.startsWith("data:")) yield buf.slice(5).trim();
}

export async function streamChat(o: Opts): Promise<string> {
  const apiKey = o.provider === "coarena" ? await resolveCoarenaKey(o.apiKey) : o.apiKey;
  if (!apiKey) throw new Error(`NO_KEY:${o.provider}`);
  let full = "";
  // Merge consecutive same-role messages (required by Gemini, safer for all providers)
  o = { ...o, messages: o.messages.reduce<ChatMsg[]>((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.role === m.role && m.role !== "system") last.content += "\n\n" + m.content; else acc.push({ ...m });
    return acc;
  }, []) };

  if (o.provider === "gemini") {
    const sys = o.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = o.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    const res = await doFetch(url, {
      method: "POST", signal: o.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}), contents, generationConfig: { temperature: o.temperature ?? 0.7 } }),
    }, o.proxy);
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await readError(res)}`);
    for await (const data of sseLines(res)) {
      try {
        const j = JSON.parse(data);
        const parts = j?.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
          if (p.thought && p.text) o.onReasoning?.(p.text);
          else if (p.text) { full += p.text; o.onToken?.(p.text); }
        }
      } catch { /* ignore */ }
    }
    return full;
  }

  const isAgent = o.provider === "mistral" && !!o.agentId?.trim();
  const url = isAgent ? "https://api.mistral.ai/v1/agents/completions" : ENDPOINT[o.provider];
  let messages = o.messages;
  if (isAgent) {
    // Agent has its own instructions; pass our context as a leading user note.
    const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    messages = messages.filter((m) => m.role !== "system");
    if (sys && messages[0]) messages = [{ role: "user", content: `[Context]\n${sys}\n\n[Message]\n${messages[0].content}` }, ...messages.slice(1)];
  }
  const reasoningModel = /^(o\d|gpt-5)/.test(o.model) || o.model === "deepseek-reasoner";
  const body: Record<string, unknown> = isAgent
    ? { agent_id: o.agentId!.trim(), messages, stream: true }
    : { model: o.model, messages, stream: true, ...(reasoningModel ? {} : { temperature: o.temperature ?? 0.7 }) };

  const res = await doFetch(url, {
    method: "POST", signal: o.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  }, o.proxy);
  if (!res.ok) throw new Error(`${o.provider} ${res.status}: ${await readError(res)}`);

  for await (const data of sseLines(res)) {
    if (data === "[DONE]") break;
    try {
      const j = JSON.parse(data);
      const d = j?.choices?.[0]?.delta ?? {};
      if (d.reasoning_content) o.onReasoning?.(d.reasoning_content);
      let c = d.content;
      if (Array.isArray(c)) c = c.map((x: any) => x?.text ?? "").join("");
      if (c) { full += c; o.onToken?.(c); }
    } catch { /* ignore */ }
  }
  return full;
}

/** Quick connectivity test for a key. */
export async function testKey(provider: Provider, apiKey: string, proxy?: string | null): Promise<string> {
  const model = { coarena: COARENA_FALLBACK_MODELS[0], xai: "grok-3-mini", openai: "gpt-4o-mini", deepseek: "deepseek-chat", mistral: "mistral-small-latest", gemini: "gemini-2.5-flash" }[provider];
  const out = await streamChat({ provider, model, apiKey, proxy, messages: [{ role: "user", content: "Reply with exactly: OK" }] });
  return out.trim() || "OK";
}

/**
 * Fetch the live Coarena model catalogue (GET /v1/models, OpenAI-compatible `data[]`).
 * Falls back to the bundled list when the network or key is unavailable.
 */
export async function listCoarenaModels(apiKey: string, proxy?: string | null): Promise<string[]> {
  if (!apiKey.trim()) {
    const ping = await pingCoarenaServer();
    if (ping.ok && ping.models?.length) return ping.models;
    return COARENA_FALLBACK_MODELS;
  }
  try {
    const res = await doFetch(COARENA_MODEL_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    }, proxy);
    if (!res.ok) throw new Error(`Coarena models ${res.status}`);
    const j = await res.json();
    const raw = Array.isArray(j) ? j : j?.data ?? j?.models ?? [];
    const ids = raw.map((m: any) => (typeof m === "string" ? m : m?.id ?? m?.name)).filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
    const unique = [...new Set(ids)];
    return unique.length ? unique : COARENA_FALLBACK_MODELS;
  } catch {
    return COARENA_FALLBACK_MODELS;
  }
}

/**
 * Rate a reply: POST /v1/feedback.
 * Fire-and-forget by design — a failed rating must never interrupt the chat.
 */
export async function sendCoarenaFeedback(payload: CoarenaFeedback, apiKey?: string, proxy?: string | null): Promise<boolean> {
  try {
    const key = await resolveCoarenaKey(apiKey);
    const res = await doFetch(COARENA_FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        rating: payload.rating,
        message_id: payload.message_id,
        model: payload.model,
        content: payload.content?.slice(0, 4000),
        comment: payload.comment,
        agent: payload.agent,
        source: "coarena-workspace",
      }),
    }, proxy);
    return res.ok;
  } catch {
    return false;
  }
}
