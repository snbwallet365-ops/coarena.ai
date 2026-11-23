// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun, Monitor, Smartphone, Settings, Plug, LifeBuoy, Keyboard, LogOut, Check, ChevronRight, Sparkles } from "lucide-react";
import { useStore, useRuntime } from "../lib/store";
import { prettyModel } from "../lib/coarena";
import { cn } from "../utils/cn";

type Section = "agents" | "browser" | "brain" | "automations" | "routines" | "connections" | "settings";

/** Google-Workspace-style account card: profile → everything about you, one tap away. */
export default function ProfileMenu({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (s: Section) => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const models = useRuntime((s) => s.models);
  const toast = useRuntime((s) => s.showToast);
  const [installEvt, setInstallEvt] = useState<any>((window as any).__installPrompt ?? null);
  const cardRef = useRef<HTMLDivElement>(null);
  const standalone = !!window.matchMedia?.("(display-mode: standalone)")?.matches || !!(navigator as any).standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const connected = !!settings.keys.coarena;
  const dark = settings.theme === "dark";
  const name = settings.userName?.trim() || "You";
  const initial = name.trim()[0]?.toUpperCase() ?? "C";

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const click = (e: MouseEvent) => { if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", k);
    setTimeout(() => window.addEventListener("mousedown", click), 0);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("mousedown", click); };
  }, [open, onClose]);

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); (window as any).__installPrompt = e; setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (!open || typeof document === "undefined") return null;

  const go = (s: Section) => { onNavigate(s); onClose(); };
  const install = async () => {
    if (standalone) return;
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }
    else toast(isIOS ? "Tap Share → Add to Home Screen" : "Use your browser menu → Install app");
  };

  return createPortal(
    <div className="fixed inset-0 z-[68]" role="dialog" aria-modal="true" aria-label="Account">
      <div className="fade-in absolute inset-0 bg-black/10 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none" onClick={onClose} />
      <div ref={cardRef} className={cn("pop lg-card !absolute overflow-hidden rounded-[26px]",
        "inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] max-h-[82dvh] md:inset-x-auto md:bottom-[86px] md:left-3 md:w-[340px]")}>
        {/* Account header */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-[#0a84ff]/20 blur-2xl" />
          <div className="relative flex items-center gap-3.5">
            <div className="logo-shine flex h-14 w-14 items-center justify-center rounded-[18px] text-[24px] font-black text-white"
              style={{ background: "linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#bf5af2 100%)" }}>{initial}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[19px] font-bold tracking-tight">{name}</div>
              <div className="truncate text-[13px] text-label2">Coarena workspace · local</div>
            </div>
            <button onClick={onClose} className="press flex h-8 w-8 items-center justify-center rounded-full bg-fill text-label2">✕</button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-fill px-3 py-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", connected ? "bg-[#34c759] shadow-[0_0_8px_#34c759]" : "bg-[#ff9500]")} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{connected ? "Coarena Free API · connected" : "Coarena API · add your key"}</span>
            <span className="shrink-0 text-[11.5px] text-label2">{prettyModel(models[0])}</span>
          </div>
        </div>

        {/* Quick tiles */}
        <div className="grid grid-cols-2 gap-2 px-4 pb-3">
          <button onClick={() => setSettings((s) => ({ ...s, theme: dark ? "light" : "dark" }))} className="press flex items-center gap-2.5 rounded-[16px] bg-fill p-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#5e5ce6] text-white">{dark ? <Moon size={17} /> : <Sun size={17} />}</span>
            <span className="min-w-0"><span className="block text-[13.5px] font-semibold">{dark ? "Dark" : "Light"}</span><span className="block text-[11.5px] text-label2">Theme</span></span>
          </button>
          <button onClick={() => setSettings((s) => ({ ...s, language: s.language === "bn" ? "en" : "bn" }))} className="press flex items-center gap-2.5 rounded-[16px] bg-fill p-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#ff9500] text-white">{settings.language === "bn" ? "বা" : "En"}</span>
            <span className="min-w-0"><span className="block text-[13.5px] font-semibold">{settings.language === "bn" ? "বাংলা" : "English"}</span><span className="block text-[11.5px] text-label2">Language · tap to switch</span></span>
          </button>
          <button onClick={install} className="press flex items-center gap-2.5 rounded-[16px] bg-fill p-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#007aff] text-white"><Smartphone size={17} /></span>
            <span className="min-w-0"><span className="block text-[13.5px] font-semibold">{standalone ? "Installed" : "Install"}</span><span className="block text-[11.5px] text-label2">PWA</span></span>
          </button>
          <button onClick={() => go("connections")} className="press flex items-center gap-2.5 rounded-[16px] bg-fill p-3 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#34c759] text-white"><Plug size={17} /></span>
            <span className="min-w-0"><span className="block text-[13.5px] font-semibold">{connected ? "Connected" : "Setup"}</span><span className="block text-[11.5px] text-label2">Connections</span></span>
          </button>
        </div>

        {/* Menu rows */}
        <div className="mx-4 mb-3 overflow-hidden rounded-[18px] bg-surface [&>*:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--sep)]">
          <Row I={Settings} bg="#8e8e93" title="All settings" subtitle="Appearance, behaviour, data" onClick={() => go("settings")} />
          <Row I={Plug} bg="#34c759" title="Connections & API keys" subtitle="Coarena · one key for every agent" onClick={() => go("connections")} />
          <Row I={LifeBuoy} bg="#007aff" title="Help & documentation" subtitle="docs.coarena.ai" onClick={() => window.open("https://coarena.ai", "_blank")} />
          <Row I={Keyboard} bg="#5856d6" title="Keyboard shortcuts" subtitle="⌘B sidebar · ⌘. computer · ⌘J theme" onClick={() => toast("⌘B sidebar · ⌘. computer · ⌘J theme")} />
        </div>

        <div className="flex items-center gap-2 px-5 pb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a84ff]/12 text-[#0a84ff]"><Sparkles size={12} /></span>
          <span className="flex-1 text-[11.5px] text-label3">Coarena · v1.0 · Free model API</span>
          <button onClick={() => { if (confirm("Sign out and clear every agent, chat and key on this device?")) { useStore.getState().resetAll(); toast("Signed out — workspace reset"); onClose(); } }}
            className="press flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold text-[#ff3b30]"><LogOut size={13} /> Sign out</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ I, bg, title, subtitle, onClick }: { I: any; bg: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-fill">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white" style={{ background: bg }}><I size={16} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium">{title}</span>
        <span className="block truncate text-[12px] text-label2">{subtitle}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-label3" />
    </button>
  );
}
