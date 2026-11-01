// @ts-nocheck
import { CheckCircle2, AlertCircle, Globe, MousePointerClick } from "lucide-react";
import { useStore, PROVIDERS } from "../lib/store";
import BotAvatar from "./BotAvatar";

export default function SetupStatus({ onFix }: { onFix?: () => void }) {
  const bots = useStore((s) => s.bots);
  const keys = useStore((s) => s.settings.keys);
  const missing = bots.filter((b) => !keys[b.provider]?.trim());
  const ready = bots.length - missing.length;

  return (
    <div className="mb-7 rounded-[22px] bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold">Setup status</div>
          <div className="text-[13px] text-label2">{ready} of {bots.length} agents ready to reply</div>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-fill2">
          <div className="h-full rounded-full bg-[#34c759] transition-all" style={{ width: `${bots.length ? (ready / bots.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="divide-y divide-fill2">
        {bots.map((b) => {
          const ok = !!keys[b.provider]?.trim();
          return (
            <div key={b.id} className="flex items-center gap-3 py-2.5">
              <BotAvatar shape={b.shape} color={b.color} status="idle" size={30} ring={false} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{b.name}</div>
                <div className="truncate text-[12.5px] text-label2">{PROVIDERS[b.provider].label} · {b.model}</div>
              </div>
              {ok ? (
                <span className="flex items-center gap-1 text-[13px] font-semibold text-[#34c759]"><CheckCircle2 size={16} />Ready</span>
              ) : (
                <button onClick={onFix} className="press flex items-center gap-1 rounded-full bg-[#ff9500]/15 px-3 py-1.5 text-[13px] font-semibold text-[#ff9500]"><AlertCircle size={15} />Needs key</button>
              )}
            </div>
          );
        })}
      </div>

      {missing.length > 0 && (
        <div className="mt-3 text-[12.5px] text-label2">Add the missing keys below — one key covers every agent on the same provider.</div>
      )}

      <div className="mt-4 rounded-[16px] bg-[#007aff]/10 p-3.5">
        <div className="mb-1.5 text-[14px] font-semibold text-[#007aff]">About the Browser Agent</div>
        <div className="flex items-start gap-2 text-[13px] leading-snug text-label">
          <Globe size={16} className="mt-0.5 shrink-0 text-[#34c759]" />
          <span><b>Can:</b> open and read web pages, search, and summarise what it finds.</span>
        </div>
        <div className="mt-1.5 flex items-start gap-2 text-[13px] leading-snug text-label">
          <MousePointerClick size={16} className="mt-0.5 shrink-0 text-[#ff3b30]" />
          <span><b>Cannot:</b> click buttons or type into forms on websites in the online app. That only works when the companion program runs on your own computer.</span>
        </div>
      </div>
    </div>
  );
}
