import { LivePairData } from "../../lib/types";
import { SignalPill } from "./SignalPill";
import { sc } from "../../lib/utils";

export function AgentSignalsPanel({ agents }: { agents: LivePairData["agents"] }) {
  const entries: { name: string; signal: string; confidence: number; probs?: any }[] = [];

  if (agents.sentiment?.available)
    entries.push({
      name: "Sentiment (5‑model ensemble)",
      signal: agents.sentiment.signal,
      confidence: agents.sentiment.confidence,
      probs: agents.sentiment.probs,
    });
  if (agents.correlation?.available)
    entries.push({
      name: "Correlation & Regime",
      signal: agents.correlation.signal,
      confidence: agents.correlation.confidence,
      probs: agents.correlation.probs,
    });
  if (agents.geopolitical?.available)
    entries.push({
      name: "Geopolitical (GDELT)",
      signal: agents.geopolitical.signal,
      confidence: agents.geopolitical.confidence,
      probs: agents.geopolitical.probs,
    });
  if (agents.technical?.available)
    entries.push({
      name: "Technical (Multi‑TF)",
      signal: agents.technical.signal,
      confidence: agents.technical.confidence,
      probs: agents.technical.probs,
    });
  if (agents.macro?.available)
    entries.push({
      name: "Macro (LLM)",
      signal: agents.macro.signal,
      confidence: agents.macro.confidence,
      probs: agents.macro.probs,
    });

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-3">
        Agent Consensus ({entries.length} active)
      </p>
      {entries.map(({ name, signal, confidence, probs }) => {
        const sig = signal as any;
        const c = sc(sig);
        return (
          <div key={name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">{name}</span>
              <SignalPill s={sig} size="sm" />
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500">Confidence</span>
              <span className="text-[10px] font-black text-slate-400">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${confidence * 100}%` }} />
            </div>
            {probs && (
              <div className="grid grid-cols-3 gap-1 mt-2">
                {(["buy", "hold", "sell"] as const).map((k) => (
                  <div key={k} className="text-center">
                    <p
                      className={`text-[9px] ${
                        k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"
                      }`}
                    >
                      {k.toUpperCase()}
                    </p>
                    <p className="text-[9px] text-slate-500">{((probs[k] ?? 0) * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}