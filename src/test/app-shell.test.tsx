// @ts-nocheck
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import App from "@/grok/App";
import { useRuntime, useStore } from "@/grok/lib/store";
import { PROVIDERS } from "@/grok/lib/store";

beforeAll(() => {
  (window as any).matchMedia = (q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  });
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  (globalThis as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  (globalThis as any).DOMRect = class DOMRect {
    x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number;
    constructor(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; this.top = y; this.left = x; this.right = x + width; this.bottom = y + height; }
    toJSON() { return this; }
  };
  const ctx: any = new Proxy({}, {
    get: (_t, prop) => (prop === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {}),
    set: () => true,
  });
  (globalThis as any).HTMLCanvasElement.prototype.getContext = () => ctx;
  (globalThis as any).requestAnimationFrame = () => 0;
  (window as any).scrollTo = () => {};
  (globalThis as any).fetch = async () => { throw new Error("offline in test"); };
});

afterEach(cleanup);

describe("Coarena workspace shell", () => {
  it("renders the sidebar, all sections and the agent roster", async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getAllByText("Coarena").length).toBeGreaterThan(0));
    expect(screen.getByText("Computer & Browser")).toBeTruthy();
    expect(screen.getByText("Brain")).toBeTruthy();
    expect(screen.getByText("Automations")).toBeTruthy();
    expect(screen.getByText("Routines")).toBeTruthy();
    expect(screen.getByText("Connections")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getAllByText("Chief of Staff Agent").length).toBeGreaterThan(0);
    expect(container.querySelector("aside")).toBeTruthy();
  });

  it("opens the profile menu with account settings", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Coarena").length).toBeGreaterThan(0));
    const profile = screen.getByText(/Coarena Free · connected/).closest("button")!;
    await act(async () => { fireEvent.click(profile); });
    await waitFor(() => expect(screen.getByText("All settings")).toBeTruthy());
    expect(screen.getByText("Connections & API keys")).toBeTruthy();
    expect(screen.getByText("Keyboard shortcuts")).toBeTruthy();
  });

  it("navigates to each section from the sidebar", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Computer & Browser")).toBeTruthy());
    for (const [label, heading] of [
      ["Computer & Browser", "Computer & Browser"],
      ["Brain", "Brain"],
      ["Automations", "Automations"],
      ["Routines", "Routines"],
      ["Connections", "Connections"],
      ["Settings", "Settings"],
    ] as const) {
      await act(async () => { fireEvent.click(screen.getByText(label)); });
      await waitFor(() => expect(screen.getAllByText(heading).length).toBeGreaterThan(0));
    }
  });

  it("opens the computer as a resizable split panel on wide screens", async () => {
    window.innerWidth = 1440;
    localStorage.setItem("ns-right", "1");
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getAllByText("Coarena").length).toBeGreaterThan(0));
    await waitFor(() => expect(container.querySelector("[data-group]")).toBeTruthy());
    expect(container.querySelector("[data-separator]")).toBeTruthy();
    expect(screen.getAllByText(/computer/i).length).toBeGreaterThan(0);
    window.innerWidth = 1024;
  });

  it("ships Coarena as the default provider for every built-in agent", () => {
    const bots = useStore.getState().bots;
    expect(bots.length).toBeGreaterThan(0);
    expect(bots.every((b) => b.provider === "coarena")).toBe(true);
    expect(PROVIDERS.coarena.label).toBe("Coarena");
    expect(useRuntime.getState().models.length).toBeGreaterThan(0);
  });
});
