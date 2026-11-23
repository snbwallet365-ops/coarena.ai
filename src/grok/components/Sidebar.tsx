// @ts-nocheck
import { useState } from "react";
import { Search, Plus, Globe, Brain, Workflow, Repeat, Plug, Settings, Sun, Moon, PanelLeftClose, PanelLeftOpen, Crown, X, ChevronsUpDown } from "lucide-react";
import { useStore, useRuntime, type Bot } from "../lib/store";
import BotAvatar from "./BotAvatar";
import ProfileMenu from "./ProfileMenu";
import { cn } from "../utils/cn";

export type Section = "agents" | "browser" | "brain" | "automations" | "routines" | "connections" | "settings";
export const NAV: { id: Section; label: string; icon: typeof Globe; color: string }[] = [
  { id: "browser", label: "Computer & Browser", icon: Globe, color: "#007aff" },
  { id: "brain", label: "Brain", icon: Brain, color: "#ff2d55" },
  { id: "automations", label: "Automations", icon: Workflow, color: "#af52de" },
  { id: "routines", label: "Routines", icon: Repeat, color: "#ff9500" },
  { id: "connections", label: "Connections", icon: Plug, color: "#34c759" },
  { id: "settings", label: "Settings", icon: Settings, color: "#8e8e93" },
];
const STATUS = { idle: "", working: "Working", waiting: "Needs you", done: "Done", error: "Error" } as const;
const STATUS_COLOR = { idle: "#c7c7cc", working: "#007aff", waiting: "#ff9500", done: "#34c759", error: "#ff3b30" } as const;
const ago = (t: number) => { const s = (Date.now() - t) / 1000; if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }); };

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="logo-shine relative flex shrink-0 items-center justify-center font-black text-white" style={{ width: size, height: size, borderRadius: size * 0.3, background: "linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#bf5af2 100%)" }}>
      <span style={{ fontSize: size * 0.56, letterSpacing: "-0.05em" }}>C</span>
    </div>
  );
}

export function StatusDot({ status, pulse = true }: { status: Bot["status"]; pulse?: boolean }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="relative inline-flex h-[7px] w-[7px] shrink-0">
      {pulse && status === "working" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: c }} />}
      <span className="relative inline-flex h-[7px] w-[7px] rounded-full" style={{ background: c, boxShadow: status === "idle" ? "none" : `0 0 6px ${c}` }} />
    </span>
  );
}

export default function Sidebar({ section, setSection, activeId, onSelectBot, onNewBot, collapsed, setCollapsed, mobile }: {
  section: Section; setSection: (s: Section) => void; activeId: string | null; onSelectBot: (id: string) => void; onNewBot: () => void;
  collapsed?: boolean; setCollapsed?: (v: boolean) => void; mobile?: boolean;
}) {
  const bots = useStore((s) => s.bots);
  const docs = useStore((s) => s.docs.length);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const live = useRuntime((s) => s.live);
  const online = useRuntime((s) => s.serverOnline);
  const flowRuns = useRuntime((s) => s.flowRuns);
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState(false);
  const c = !!collapsed && !mobile;
  const dark = settings.theme === "dark";
  const close = () => useRuntime.getState().set({ drawer: false });

  const list = [...bots].filter((b) => (b.name + " " + b.title).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.status === "waiting") - Number(a.status === "waiting") || Number(!!b.main) - Number(!!a.main) || b.updatedAt - a.updatedAt);
  const runningFlows = Object.values(flowRuns).filter((f) => f.running).length;
  const badge = (id: Section) => id === "brain" ? docs : id === "automations" ? runningFlows : 0;
  const working = bots.filter((b) => (live[b.id] && b.status !== "waiting") || b.status === "working").length;
  const name = settings.userName?.trim() || "You";

  const BotRow = (b: Bot, i: number) => {
    const status = live[b.id] && b.status !== "waiting" ? "working" : b.status;
    const active = section === "agents" && activeId === b.id;
    return (
      <button key={b.id} title={b.name} onClick={() => { onSelectBot(b.id); if (mobile) close(); }} style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
        className={cn("fade-up press group relative flex w-full items-center gap-2.5 rounded-[14px] text-left transition-all duration-200", c ? "justify-center p-1.5" : "px-2 py-2",
          active ? "bg-[#007aff] text-white shadow-[0_6px_20px_rgba(0,122,255,.35)]" : "hover:bg-[var(--surface)]/70 active:bg-fill")}>
        <div className="relative">
          <BotAvatar shape={b.shape} color={active && b.color === "#1c1c1e" ? "#ffffff" : b.color} status={status} size={c ? 38 : 36} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[var(--surface)]">
            <StatusDot status={status} pulse={false} />
          </span>
        </div>
        {c && b.unread ? <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[#ff3b30]" /> : null}
        {!c && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-[14.5px] font-semibold">{b.name}</span>
              {b.main && <Crown size={11} className={active ? "text-white/80" : "text-[#ff9500]"} />}
              <span className={cn("ml-auto shrink-0 text-[11.5px]", active ? "text-white/70" : "text-label3")}>{ago(b.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              {STATUS[status] && <span className={cn("shrink-0 text-[12.5px] font-medium", active ? "text-white" : status === "working" ? "shimmer-text" : status === "waiting" ? "text-[#ff9500]" : status === "done" ? "text-[#34c759]" : "text-[#ff3b30]")}>{STATUS[status]} ·</span>}
              <span className={cn("truncate text-[12.5px]", active ? "text-white/80" : "text-label2")}>{status === "idle" ? b.title : b.preview}</span>
              {b.unread ? <span className={cn("ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold", active ? "bg-white text-[#007aff]" : "bg-[#007aff] text-white")}>{b.unread}</span> : null}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <aside className={cn("lg-panel relative z-20 flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.2,.9,.25,1)]",
      mobile ? "pt-safe w-[86vw] max-w-[340px] rounded-r-[28px]" : c ? "w-[78px] rounded-[26px]" : "w-[306px] rounded-[26px]")}>
      {/* Brand */}
      <div className={cn("flex items-center gap-2.5 px-3 pt-3.5 pb-2.5", c && "flex-col px-2")}>
        <Logo size={c ? 42 : 38} />
        {!c && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[17px] font-bold tracking-tight">Coarena</span>
              <span className="rounded-full bg-[#0a84ff]/12 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-[#0a84ff]">Free</span>
            </div>
            <div className="truncate text-[11.5px] text-label2">AI agent workspace</div>
          </div>
        )}
        <button onClick={() => setSettings((s) => ({ ...s, theme: dark ? "light" : "dark" }))} title={dark ? "Light mode" : "Dark mode"} aria-label="Toggle theme"
          className="press lg-pill relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Sun size={16} className={cn("absolute text-[#ff9f0a] transition-all duration-500", dark ? "translate-y-6 rotate-90 opacity-0" : "translate-y-0 opacity-100")} />
          <Moon size={15} className={cn("absolute text-[#5e5ce6] transition-all duration-500", dark ? "translate-y-0 opacity-100" : "-translate-y-6 -rotate-90 opacity-0")} />
        </button>
        {mobile ? (
          <button onClick={close} aria-label="Close menu" className="press lg-pill flex h-8 w-8 items-center justify-center rounded-full"><X size={16} /></button>
        ) : (
          <button onClick={() => setCollapsed?.(!c)} title={c ? "Expand" : "Collapse"} aria-label={c ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label2 hover:bg-fill", c && "h-8 w-8")}>
            {c ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}
      </div>

      {/* New agent + search */}
      {c ? (
        <div className="flex justify-center pb-2">
          <button onClick={onNewBot} title="New Agent" aria-label="New Agent" className="press flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#007aff] text-white shadow-[0_6px_18px_rgba(0,122,255,.35)]"><Plus size={20} strokeWidth={2.5} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex h-9 flex-1 items-center gap-1.5 rounded-[12px] bg-fill px-2.5 text-label2 ring-1 ring-transparent transition-shadow focus-within:ring-[#007aff]/30">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents" aria-label="Search agents"
              className="w-full bg-transparent text-[15px] text-label outline-none placeholder:text-label2" />
            {q && <button onClick={() => setQ("")} className="text-label3 hover:text-label"><X size={13} /></button>}
          </div>
          <button onClick={() => { onNewBot(); if (mobile) close(); }} title="New Agent" aria-label="New Agent"
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#007aff] text-white shadow-[0_6px_18px_rgba(0,122,255,.35)]"><Plus size={19} strokeWidth={2.5} /></button>
        </div>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {/* Navigation */}
        <div className={cn("mb-1 space-y-0.5", c && "flex flex-col items-center")}>
          {NAV.map((n, i) => {
            const active = section === n.id; const bd = badge(n.id);
            return (
              <button key={n.id} title={n.label} onClick={() => { setSection(n.id); if (mobile) close(); }} style={{ animationDelay: `${i * 30}ms` }}
                className={cn("fade-up press relative flex items-center gap-2.5 rounded-[13px] transition-all duration-200", c ? "h-11 w-11 justify-center" : "w-full px-2 py-1.5",
                  active ? "bg-[var(--surface)] shadow-[0_2px_10px_rgba(0,0,0,.06)]" : "hover:bg-[var(--surface)]/50")}>
                <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_2px_8px_rgba(0,0,0,.12)]"
                  style={{ background: `linear-gradient(160deg, ${n.color}cc, ${n.color})` }}><n.icon size={16} strokeWidth={2.2} /></span>
                {!c && <span className={cn("flex-1 text-left text-[14.5px]", active ? "font-semibold" : "font-medium")}>{n.label}</span>}
                {!c && n.id === "browser" && <span className={cn("h-2 w-2 rounded-full", online ? "bg-[#34c759] shadow-[0_0_6px_#34c759]" : "bg-label3")} />}
                {!c && bd > 0 && <span className={cn("rounded-full px-1.5 text-[11.5px] font-semibold", n.id === "automations" ? "bg-[#af52de] text-white" : "text-label2")}>{bd}</span>}
              </button>
            );
          })}
        </div>

        {/* Roster */}
        {!c && (
          <div className="flex items-center px-2 pt-3 pb-1">
            <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide text-label2">Agents · {bots.length}</span>
            {working > 0 && <span className="flex items-center gap-1 text-[11.5px] font-medium text-[#007aff]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#007aff]" />{working} working</span>}
          </div>
        )}
        {c && <div className="mx-auto my-2 h-px w-8 bg-sep" />}
        <div className="space-y-0.5">
          {list.map((b, i) => BotRow(b, i))}
          {list.length === 0 && !c && (
            <div className="px-3 py-8 text-center text-[13px] text-label2">No agents match “{q}”.</div>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className={cn("shrink-0 px-2 pb-2", c && "px-2")}>
        {c ? (
          <button onClick={() => setProfile(true)} title="Account" className="press mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)] shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-black text-white" style={{ background: "linear-gradient(135deg,#0a84ff,#5e5ce6)" }}>{name[0]?.toUpperCase() ?? "C"}</span>
          </button>
        ) : (
          <button onClick={() => setProfile(true)} className="press flex w-full items-center gap-2.5 rounded-[16px] bg-[var(--surface)]/70 p-2 text-left ring-1 ring-[var(--glass-border)] transition-all hover:bg-[var(--surface)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
              style={{ background: "linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#bf5af2 100%)" }}>{name[0]?.toUpperCase() ?? "C"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold">{name}</span>
              <span className="flex items-center gap-1 text-[11.5px] text-label2"><span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" />Coarena Free · connected</span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-label3" />
          </button>
        )}
      </div>

      <ProfileMenu open={profile} onClose={() => setProfile(false)} onNavigate={(s) => { setSection(s); if (mobile) close(); }} />
    </aside>
  );
}
