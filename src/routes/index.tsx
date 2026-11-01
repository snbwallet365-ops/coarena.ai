import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";

const App = lazy(() => import("@/grok/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "N Space · Grok Bot" },
      { name: "description", content: "Multi-agent AI teammates — Grok, OpenAI, Gemini, Mistral, DeepSeek, browser, visa, legal & PDF experts." },
      { property: "og:title", content: "N Space · Grok Bot" },
      { property: "og:description", content: "Multi-agent AI teammates for visa, legal, research and PDF work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Pwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const h = (e: Event) => { e.preventDefault(); (window as any).__installPrompt = e; };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return null;
}

function Index() {
  return (
    <div className="h-dvh">
      <ClientOnly fallback={null}>
        <Pwa />
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
