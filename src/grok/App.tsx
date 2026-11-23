// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Sparkles } from "lucide-react";
import { useStore, useRuntime } from "./lib/store";
import { checkServer, runBot } from "./lib/agent";
import { runFlow } from "./lib/flows";
import Sidebar, { NAV, type Section } from "./components/Sidebar";
import ChatView from "./components/ChatView";
import ComputerPanel from "./components/ComputerPanel";
import BotEditor from "./components/BotEditor";
import BrainView from "./components/BrainView";
import AutomationsView from "./components/AutomationsView";
import { BrowserView, RoutinesView, ConnectionsView, SettingsView } from "./components/Sections";

const useWidth = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const r = () => setW(window.innerWidth); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);
  return w;
};

export default function App() {
  const bots = useStore((s) => s.bots);
  const theme = useStore((s) => s.settings.theme);
  const live = useRuntime((s) => s.live);
  const browser = useRuntime((s) => s.browser);
  const drawer = useRuntime((s) => s.drawer);
  const rightOpen = useRuntime((s) => s.rightOpen);
  const toast = useRuntime((s) => s.toast);
  const setRT = useRuntime((s) => s.set);
  const width = useWidth();
  const wide = width >= 768, xl = width >= 1180;

  const [section, setSection] = useState<Section>(() => {
    const s = new URLSearchParams(location.search).get("section") as Section | null;
    return s && (s === "agents" || NAV.some((n) => n.id === s)) ? s : "agents";
  });
  const [activeId, setActiveId] = useState<string | null>(() => useStore.getState().bots[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("ns-collapsed") === "1");
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const autoTurn = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem("ns-collapsed", collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { if (!activeId || !bots.find((b) => b.id === activeId)) setActiveId(bots[0]?.id ?? null); }, [bots, activeId]);
  useEffect(() => { if (xl && localStorage.getItem("ns-right") !== "0") setRT({ rightOpen: true }); }, []);
  useEffect(() => { if (xl) localStorage.setItem("ns-right", rightOpen ? "1" : "0"); }, [rightOpen, xl]);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#060608" : "#eef1f8");
  }, [theme]);

  // Document title follows the active surface
  useEffect(() => {
    const label = section === "agents" ? (bots.find((b) => b.id === activeId)?.name ?? "Agents") : NAV.find((n) => n.id === section)?.label ?? "Workspace";
    document.title = `${label} · Coarena`;
  }, [section, activeId, bots]);

  // Auto-open the computer panel when the active agent starts using the browser (once per turn)
  useEffect(() => {
    const turn = activeId ? live[activeId] : null;
    if (browser && turn && browser.botId === activeId && autoTurn.current !== turn && wide) {
      autoTurn.current = turn; setRT({ rightOpen: true, rightTab: "computer" });
    }
  }, [browser?.url, browser?.botId, activeId, live, wide]);

  // Cross-surface navigation (e.g. Settings → Connections)
  useEffect(() => {
    const h = (e: Event) => { const s = (e as CustomEvent).detail as Section | undefined; if (s && (s === "agents" || NAV.some((n) => n.id === s))) { setSection(s); setRT({ drawer: false }); } };
    window.addEventListener("coarena:navigate", h);
    return () => window.removeEventListener("coarena:navigate", h);
  }, []);

  // Local server health
  useEffect(() => { checkServer(); const t = setInterval(checkServer, 15000); return () => clearInterval(t); }, []);

  // Real-time schedulers: routines + automation flows
  useEffect(() => {
    const tick = () => {
      const { routines, updateRoutine, bots, flows } = useStore.getState();
      const now = Date.now(); const R = useRuntime.getState();
      for (const r of routines) {
        if (!r.enabled || !bots.find((b) => b.id === r.botId) || R.live[r.botId]) continue;
        if (now >= (r.lastRun ?? 0) + r.everyMinutes * 60000) { updateRoutine(r.id, { lastRun: now }); runBot(r.botId, r.prompt, { routine: r.name }); }
      }
      for (const f of flows) {
        if (f.trigger !== "schedule" || !f.enabled || R.flowRuns[f.id]?.running) continue;
        if (now >= (f.lastRun ?? 0) + f.everyMinutes * 60000) runFlow(f.id);
      }
    };
    const t = setInterval(tick, 20000); tick();
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcuts (desktop app feel)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "b") { e.preventDefault(); setCollapsed((c) => !c); }
      if (e.key === ".") { e.preventDefault(); setRT({ rightOpen: !useRuntime.getState().rightOpen }); }
      if (e.key === "j") { e.preventDefault(); useStore.getState().setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" })); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const selectBot = (id: string) => { setActiveId(id); setSection("agents"); };
  const openKeys = () => { setSection("connections"); setRT({ drawer: false }); };
  const showRight = section === "agents" && !!activeId && rightOpen;

  const sidebar = (mobile = false) => (
    <Sidebar section={section} setSection={setSection} activeId={activeId} onSelectBot={selectBot} onNewBot={() => setEditor({ open: true, id: null })}
      collapsed={collapsed} setCollapsed={setCollapsed} mobile={mobile} />
  );

  const content = () => {
    switch (section) {
      case "browser": return <BrowserView onOpenBot={selectBot} />;
      case "brain": return <BrainView />;
      case "automations": return <AutomationsView />;
      case "routines": return <RoutinesView />;
      case "connections": return <ConnectionsView />;
      case "settings": return <SettingsView />;
      default:
        if (!activeId) return (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#007aff]/12 text-[#007aff]"><Sparkles size={30} /></div>
            <div className="text-[20px] font-bold">Create your first agent</div>
            <div className="max-w-sm text-[14.5px] text-label2">Give it a job, a model and a set of tools — then talk to it like a teammate.</div>
            <button onClick={() => setEditor({ open: true, id: null })} className="press mt-1 rounded-full bg-[#007aff] px-5 py-2.5 text-[15px] font-semibold text-white">New Agent</button>
          </div>
        );
        return <ChatView key={activeId} botId={activeId} onEdit={() => setEditor({ open: true, id: activeId })} onOpenKeys={openKeys} />;
    }
  };

  const main = (
    <main key={section === "agents" ? "agents" : section} className="lg-card fade-in relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden md:rounded-[26px]">
      {content()}
    </main>
  );

  return (
    <div className="app-bg relative flex h-dvh w-full overflow-hidden md:gap-2.5 md:p-2.5">
      {/* Ambient liquid blobs */}
      <div className="blob top-[-10%] left-[-5%] h-[45vh] w-[45vh] bg-[#7aa8ff]" />
      <div className="blob right-[-8%] bottom-[-12%] h-[50vh] w-[50vh] bg-[#ff9ec7]" style={{ animationDelay: "-8s" }} />
      <div className="blob top-[30%] left-[45%] h-[35vh] w-[35vh] bg-[#8ef0cf]" style={{ animationDelay: "-15s" }} />

      {wide && sidebar()}

      {!wide && drawer && (
        <div className="fixed inset-0 z-[55]">
          <div className="fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setRT({ drawer: false })} />
          <div className="drawer-in absolute inset-y-0 left-0">{sidebar(true)}</div>
        </div>
      )}

      {showRight && xl ? (
        <PanelGroup orientation="horizontal" className="relative z-10 min-w-0 flex-1 gap-2.5">
          <Panel id="chat" defaultSize="64%" minSize="34%" className="min-w-0">
            {main}
          </Panel>
          <PanelResizeHandle className="group relative w-2 shrink-0 rounded-full transition-colors hover:bg-[#007aff]/20">
            <span className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sep transition-all group-hover:h-20 group-hover:bg-[#007aff]/70" />
          </PanelResizeHandle>
          <Panel id="computer" defaultSize="36%" minSize="24%" maxSize="60%" className="min-w-0">
            <div className="h-full">
              <ComputerPanel botId={activeId!} onClose={() => setRT({ rightOpen: false })} />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        <>
          {main}
          {showRight && activeId && (
            <div className="fixed inset-0 z-[56]">
              <div className="fade-in absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={() => setRT({ rightOpen: false })} />
              <div className="slide-right absolute inset-y-0 right-0 w-full max-w-[440px] md:inset-y-2.5 md:right-2.5">
                <ComputerPanel botId={activeId} onClose={() => setRT({ rightOpen: false })} />
              </div>
            </div>
          )}
        </>
      )}

      <BotEditor botId={editor.id} open={editor.open} onClose={() => setEditor({ open: false, id: null })} onCreated={selectBot} />

      {toast && <div className="toast-in lg-pill fixed top-[calc(env(safe-area-inset-top)+72px)] left-1/2 z-[80] rounded-full px-4 py-2.5 text-[14px] font-semibold">{toast}</div>}
    </div>
  );
}
