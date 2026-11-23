/**
 * Coarena Free Model API — single-key, OpenAI-compatible provider.
 *
 * Base URL (OpenAI-compatible):  https://coarena.ai/api/v1
 * Anthropic-compatible base URL: https://coarena.ai/api
 * Models:                       GET  https://coarena.ai/api/v1/models
 * Chat completions:             POST https://coarena.ai/api/v1/chat/completions
 * Reply rating / feedback:      POST https://coarena.ai/api/v1/feedback
 *
 * The key is NEVER compiled into this client module. It is resolved at runtime
 * through `coarenaServer.ts` (server function) or typed by the user in
 * Connections, so the browser bundle contains no credentials.
 */
export const COARENA_API_BASE = "https://coarena.ai/api/v1";
/** @deprecated Kept for callers that still reference it — always empty now. Use the server bridge. */
export const COARENA_API_KEY: string = "";

export const COARENA_DEFAULT_MODEL: string = (
  (import.meta.env["VITE_COARENA_MODEL"] as string | undefined) ?? ""
).trim() || "deepseek-v4.1-flash-1017";

/** Shown until the live model list has been fetched from /v1/models. */
export const COARENA_FALLBACK_MODELS: string[] = [COARENA_DEFAULT_MODEL];

/** Human-friendly short label for a model id (used in tight UI spaces). */
export function prettyModel(model: string | undefined | null): string {
  const m = (model ?? "").trim();
  if (!m) return "—";
  if (m === COARENA_DEFAULT_MODEL) return "Flash 1017";
  if (/deepseek-v4\.1-flash/i.test(m)) return "DeepSeek Flash";
  return m.length > 24 ? `${m.slice(0, 22)}…` : m;
}

export const COARENA_MODEL_ENDPOINT = `${COARENA_API_BASE}/models`;
export const COARENA_CHAT_ENDPOINT = `${COARENA_API_BASE}/chat/completions`;
export const COARENA_FEEDBACK_ENDPOINT = `${COARENA_API_BASE}/feedback`;

export type FeedbackRating = 1 | -1;

export interface CoarenaFeedback {
  rating: FeedbackRating;
  /** Local message id — lets the API dedupe / group a conversation. */
  message_id?: string;
  model?: string;
  /** A short excerpt of the rated reply so feedback is useful without storage. */
  content?: string;
  comment?: string;
  agent?: string;
}
