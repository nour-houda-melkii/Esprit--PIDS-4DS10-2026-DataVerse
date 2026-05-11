"use client";

import { useState } from "react";
import { Brain, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { AgentSignalsPanel } from "../../components/ui/AgentSignalsPanel";
import { sc } from "../../lib/utils";

// Helper – same as original
function buildReasoning(pair: Pair, agents: LivePairData["agents"], signal: any, explanation: string | null) {
  // Copy the exact function from your original page.tsx.
  // I'm providing a placeholder; you must paste the real one.
  return {
    headline: "Signal Reasoning",
    summary: explanation || "No explanation available.",
    factors: [],
    risks: [],
    macro: { rate_base: "", rate_quote: "", differential: "", gdp_base: "", gdp_quote: "", inflation_base: "", inflation_quote: "" },
    technical: { trend: "", support: "", resistance: "", rsi: 50, pattern: "", volume: "" },
    agents: [],
  };
}

export function ReasoningTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const sig = pd.signal;
  const r = buildReasoning(pair, pd.agents, sig, pd.explanation);
  const c = sc(sig);
  const [openFactor, setOpenFactor] = useState<number | null>(null);
  const [openRisk, setOpenRisk] = useState<number | null>(null);
  const sv = {
    HIGH: { cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
    MEDIUM: { cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    LOW: { cls: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border p-5" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.09] shrink-0">
            <Brain className="h-5 w-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white">Signal Reasoning</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Why ARIA is signalling {sig} on {pair}</p>
          </div>
          <SignalPill s={sig} />
        </div>

        {/* Raw model output */}
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 mb-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Raw Model Output</p>
          <div className="grid grid-cols-3 gap-2">
            {pd.probs && (["buy", "hold", "sell"] as const).map(k => (
              <div key={k} className="text-center rounded-lg bg-white/[0.03] py-2">
                <p className={`text-[9px] font-bold ${k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"}`}>{k.toUpperCase()}</p>
                <p className="text-sm font-black text-white">{((pd.probs![k] ?? 0) * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
          {pd.reason && <p className="text-[10px] text-slate-500 pt-2 border-t border-white/[0.05]">{pd.reason}</p>}
        </div>

        <div className={`rounded-2xl border p-4 ${c.bg} ${c.border} mb-4`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${c.text}`}>{r.headline}</p>
          <p className="text-xs text-slate-200 leading-relaxed">{r.summary}</p>
        </div>

        {pd.explanation && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-2">LLaMA-3.1-70B Analysis</p>
            <p className="text-xs text-slate-300 leading-relaxed">{pd.explanation}</p>
          </div>
        )}

        {pd.agents && Object.keys(pd.agents).length > 0 && <AgentSignalsPanel agents={pd.agents} />}

        <div className="flex flex-wrap gap-1.5 mt-4">
          {r.agents.map(a => (
            <span key={a} className="rounded-full border border-blue-500/25 bg-blue-500/8 px-2.5 py-1 text-[9px] font-black text-blue-400">{a.toUpperCase()} AGENT</span>
          ))}
          {pd.lastUpdated && (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[9px] font-black text-emerald-400">LIVE PREDICTION</span>
          )}
          {pd.gated && (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2.5 py-1 text-[9px] font-black text-amber-400">CONFIDENCE GATED</span>
          )}
        </div>
      </div>

      {/* Sentiment sub-model votes */}
      {pd.agents.sentiment?.model_votes && Object.keys(pd.agents.sentiment.model_votes).length > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Sentiment Sub‑Model Votes</p>
            <span className="ml-auto text-[9px] text-emerald-400">{pd.agents.sentiment.articles_used ?? 0} articles</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(pd.agents.sentiment.model_votes).map(([modelName, votes]) => {
              const best = Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b);
              const bestSig = best[0].toUpperCase() as any;
              const bc = sc(bestSig);
              const LABELS: Record<string, string> = { lr: "Logistic Regression", lgb: "LightGBM", textcnn: "TextCNN", bilstm: "BiLSTM + Attention", transformer: "DistilBERT Transformer" };
              return (
                <div key={modelName} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-300">{LABELS[modelName] ?? modelName}</span>
                    <SignalPill s={bestSig} size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["buy", "hold", "sell"] as const).map(k => (
                      <div key={k} className="text-center">
                        <p className={`text-[9px] ${k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"}`}>{k.toUpperCase()}</p>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-1">
                          <div className={`h-full ${k === "buy" ? "bg-emerald-500" : k === "hold" ? "bg-amber-500" : "bg-rose-500"} rounded-full`} style={{ width: `${((votes[k] ?? 0) * 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">{((votes[k] ?? 0) * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Why This Signal */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-black text-white">Why This Signal</p>
          <span className="ml-auto text-[10px] text-slate-600">Tap to expand</span>
        </div>
        <div className="space-y-2.5">
          {r.factors.map((f, i) => {
            const isOpen = openFactor === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all overflow-hidden cursor-pointer ${isOpen ? `${c.border} ${c.bg}` : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                onClick={() => setOpenFactor(isOpen ? null : i)}
              >
                <div className="flex items-center gap-3.5 p-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${c.border} ${c.bg}`}>
                    <span className={`text-xs font-black ${c.text}`}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-white">{f.label}</p>
                      <span className="shrink-0 rounded-full border border-blue-500/25 bg-blue-500/8 px-2 py-0.5 text-[9px] font-bold text-blue-400">{f.agent}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${f.strength}%` }} />
                      </div>
                      <span className={`text-[10px] font-black shrink-0 ${c.text}`}>{f.strength}%</span>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="border-t border-white/[0.07] pt-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{f.detail}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risks */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <p className="text-sm font-black text-white">What Could Invalidate This?</p>
        </div>
        <div className="space-y-2.5">
          {r.risks.map((risk, i) => {
            const s = sv[risk.severity as keyof typeof sv];
            const isOpen = openRisk === i;
            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all overflow-hidden cursor-pointer ${isOpen ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                onClick={() => setOpenRisk(isOpen ? null : i)}
              >
                <div className="flex items-center gap-3.5 p-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${s.cls}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-white">{risk.label}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${s.cls}`}>{risk.severity}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{risk.detail}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="border-t border-white/[0.07] pt-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{risk.detail}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}