import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";

const App = lazy(() => import("@/grok/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coarena — AI Agent Workspace" },
      { name: "description", content: "A real AI agent workspace — browser agents, visa & legal experts, PDF generation, automations and long-term memory. Powered by the Coarena Free Model API." },
      { property: "og:title", content: "Coarena — AI Agent Workspace" },
      { property: "og:description", content: "A real AI agent workspace for browsing, documents, automations and memory." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Coarena" },
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
