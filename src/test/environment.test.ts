// @ts-nocheck
/**
 * Environment smoke test.
 *
 * Guards the sandbox / dev setup: the Coarena workspace key and the Supabase
 * variables the app needs must be present in `.env` and resolve the same way the
 * server reads them. Values are never printed — only presence and shape.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ENV_FILE = path.join(ROOT, ".env");

function parseDotEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line
      .slice(0, eq)
      .replace(/^export\s+/, "")
      .trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    if (key) out[key] = value;
  }
  return out;
}

const envExists = existsSync(ENV_FILE);
const fileEnv = envExists ? parseDotEnv(ENV_FILE) : {};
const describeWithEnv = envExists ? describe : describe.skip;

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

describe("environment file", () => {
  it("ships a .env at the project root", () => {
    expect(envExists).toBe(true);
  });
});

describeWithEnv("Coarena API key", () => {
  it("is defined in .env", () => {
    expect(fileEnv.COARENA_API_KEY).toBeTruthy();
  });

  it("is server-only (no VITE_ twin)", () => {
    expect(fileEnv.COARENA_API_KEY).toBeTruthy();
    expect(fileEnv.VITE_COARENA_API_KEY).toBeUndefined();
  });

  it("has no stray quotes or whitespace", () => {
    const raw = fileEnv.COARENA_API_KEY ?? "";
    expect(raw).toBe(raw.trim());
    expect(raw).not.toMatch(/^["']|["']$/);
    expect(raw.length).toBeGreaterThan(10);
  });

  it("resolves through the server's lookup order (process.env, then .env)", () => {
    const resolved =
      clean(process.env.COARENA_API_KEY) ||
      clean(fileEnv.COARENA_API_KEY) ||
      clean(process.env.VITE_COARENA_API_KEY);
    expect(resolved.length).toBeGreaterThan(10);
  });

  it("pins a default model for the composer", () => {
    expect(fileEnv.VITE_COARENA_MODEL).toBeTruthy();
  });
});

describeWithEnv("Supabase configuration", () => {
  it("defines a project URL for both server and client", () => {
    expect(fileEnv.SUPABASE_URL).toBeTruthy();
    expect(fileEnv.VITE_SUPABASE_URL).toBeTruthy();
    expect(fileEnv.VITE_SUPABASE_URL).toBe(fileEnv.SUPABASE_URL);
  });

  it("uses an https project URL", () => {
    const url = new URL(fileEnv.SUPABASE_URL);
    expect(url.protocol).toBe("https:");
  });

  it("defines a publishable key for both server and client", () => {
    expect(fileEnv.SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
    expect(fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
    expect(fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY).toBe(fileEnv.SUPABASE_PUBLISHABLE_KEY);
  });
});

describe("sandbox runtime", () => {
  it("listens on port 3000 when running in preview mode", () => {
    if (process.env.BASE44_PREVIEW_MODE !== "1") return;
    expect(process.env.PORT).toBe("3000");
    expect(process.env.HOST).toBe("0.0.0.0");
  });
});
