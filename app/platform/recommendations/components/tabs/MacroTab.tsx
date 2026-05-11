"use client";

import { Globe, Zap, Clock } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { sc } from "../../lib/utils";
import { FLAGS } from "../../lib/constants";

function buildReasoning(pair: Pair, agents: LivePairData["agents"], signal: any, explanation: string | null) {
  // Same as before – paste the real function.
  return {
    macro: { rate_base: "", rate_quote: "", differential: "", gdp_base: "", gdp_quote: "", inflation_base: "", inflation_quote: "" },
    // ... other fields
  };
}

export function MacroTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const sig = pd.signal;
  const r = buildReasoning(pair, pd.agents, sig, pd.explanation);
  const c = sc(sig);
  const [base, quote] = pair.split("/");

  const events = [
    { name: `ECB Rate Decision`, impact: "HIGH" as const, timing: "Next week", currency: base },
    { name: `${base} GDP Release`, impact: "HIGH" as const, timing: "2 weeks", currency: base },
    { name: `US CPI Inflation`, impact: "HIGH" as const, timing: "3 days", currency: quote },
    { name: `${quote} Labour Market Report`, impact: "MEDIUM" as const, timing: "4 days", currency: quote },
    { name: `${base} Purchasing Managers Index`, impact: "MEDIUM" as const, timing: "5 days", currency: base },
  ];

  return (
    <div className="space-y-5">
      {/* Live macro agent output */}
      {pd.agents.macro?.available && (
        <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-black text-white">Live Macro Agent</p>
            <SignalPill s={pd.agents.macro.signal} size="sm" />
          </div>
          {pd.agents.macro.summary && <p className="text-xs text-slate-300 leading-relaxed mb-3">{pd.agents.macro.summary}</p>}
          {pd.agents.macro.drivers && pd.agents.macro.drivers.length > 0 && (
            <div className="space-y-1.5">
              {pd.agents.macro.drivers.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-blue-400 shrink-0">•</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.05]">
            {[
              { l: "Pair Score", v: `${((pd.agents.macro.pair_score ?? 0) * 100).toFixed(0)}%` },
              { l: "Base Score", v: `${((pd.agents.macro.base_score ?? 0) * 100).toFixed(0)}%` },
              { l: "Quote Score", v: `${((pd.agents.macro.quote_score ?? 0) * 100).toFixed(0)}%` },
            ].map(s => (
              <div key={s.l} className="text-center rounded-xl bg-black/20 py-2">
                <p className="text-[9px] text-slate-600 mb-0.5">{s.l}</p>
                <p className="text-sm font-black text-white">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interest Rate Differential */}
      <div className="rounded-3xl border p-6" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Interest Rate Differential</p>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-center">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">{FLAGS[base]} {base}</p>
            <p className="font-mono text-2xl font-black text-white">{r.macro.rate_base.split(" ")[0]}</p>
            <p className="text-xs text-slate-500 mt-1">{r.macro.rate_base.split(" ").slice(1).join(" ")}</p>
          </div>
          <div className="shrink-0 text-center px-2">
            <p className="text-[8px] text-slate-600 mb-1">GAP</p>
            <p className={`text-xl font-black ${c.text}`}>{r.macro.differential}</p>
          </div>
          <div className="flex-1 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-center">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">{FLAGS[quote]} {quote}</p>
            <p className="font-mono text-2xl font-black text-white">{r.macro.rate_quote.split(" ")[0]}</p>
            <p className="text-xs text-slate-500 mt-1">{r.macro.rate_quote.split(" ").slice(1).join(" ")}</p>
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${c.text}`}>How This Drives {sig} on {pair}</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {sig === "BUY" ? `${base} has improving yield prospects relative to ${quote}. Capital flows favour ${base}-denominated assets.`
              : sig === "SELL" ? `${quote} holds a yield advantage. Investors prefer ${quote}-denominated assets, pressuring ${pair} lower.`
              : `Rate differential is roughly balanced — no clear yield advantage. Watch for a decisive policy shift.`}
          </p>
        </div>
      </div>

      {/* Economic table */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.07] bg-black/20">
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[base]} {base}</p></div>
          <div className="px-4 py-3 text-center border-x border-white/[0.07] min-w-[110px]"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Metric</p></div>
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[quote]} {quote}</p></div>
        </div>
        {[
          { metric: "Interest Rate", base: r.macro.rate_base, quote: r.macro.rate_quote },
          { metric: "GDP Growth", base: r.macro.gdp_base, quote: r.macro.gdp_quote },
          { metric: "Inflation", base: r.macro.inflation_base, quote: r.macro.inflation_quote },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.04] last:border-0">
            <div className="px-5 py-4 text-center"><p className="text-sm font-black text-white">{row.base}</p></div>
            <div className="px-4 py-4 text-center border-x border-white/[0.04] min-w-[110px]"><p className="text-[9px] text-slate-600">{row.metric}</p></div>
            <div className="px-5 py-4 text-center"><p className="text-sm font-black text-white">{row.quote}</p></div>
          </div>
        ))}
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Upcoming Events</p>
        </div>
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden divide-y divide-white/[0.04]">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-2xl shrink-0">{FLAGS[ev.currency]}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{ev.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">~{ev.timing}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${ev.impact === "HIGH" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>{ev.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}