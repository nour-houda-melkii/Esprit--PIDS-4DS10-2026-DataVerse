"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar as ReRadar, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Activity, Layers, BarChart2, Eye, Clock } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { sc } from "../../lib/utils";
import { PRICE, TARGET, HISTORY } from "../../lib/constants";

function liveRadar(pair: Pair, agents: LivePairData["agents"]): Record<string, number> {
  const base = { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 };
  if (agents.sentiment?.available) base.Sentiment = Math.round((agents.sentiment.confidence ?? 0.5) * 100);
  if (agents.correlation?.available) base.Momentum = Math.round((agents.correlation.confidence ?? 0.32) * 100);
  if (agents.technical?.available) base.Technical = Math.round((agents.technical.confidence ?? 0.33) * 100);
  if (agents.macro?.available) base.Macro = Math.round((agents.macro.confidence ?? 0.33) * 100);
  if (agents.geopolitical?.available) base.Risk = Math.round((1 - (agents.geopolitical.confidence ?? 0.33)) * 100);
  return base;
}

export function TechnicalTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const sig = pd.signal;
  const c = sc(sig);
  const t = TARGET[pair];
  const hist = HISTORY[pair];
  const radarData = Object.entries(liveRadar(pair, pd.agents)).map(([k, v]) => ({ subject: k, value: v, fullMark: 100 }));
  const priceData = hist.map((v, i) => ({ i, v, sma: i >= 4 ? hist.slice(i - 4, i + 1).reduce((a, b) => a + b) / 5 : v }));
  const yMin = Math.min(parseFloat(t.sl), hist[0]) * 0.9993;
  const yMax = Math.max(parseFloat(t.tp), hist[hist.length - 1]) * 1.0007;
  const tfVotes = pd.agents.technical?.tf_votes;

  return (
    <div className="space-y-5">
      {/* Price chart */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Price Action</p>
          </div>
          <span className="text-[10px] text-slate-600">14-period · TP / SL / Entry</span>
        </div>
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={priceData} margin={{ top: 15, right: 55, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="pcg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.hex} stopOpacity={0.2} />
                <stop offset="95%" stopColor={c.hex} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
            <XAxis dataKey="i" tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => `T-${13 - v}`} />
            <YAxis domain={[yMin, yMax]} tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => v.toFixed(3)} width={55} />
            <Tooltip formatter={(v: number, n: string) => [v.toFixed(4), n === "v" ? "Price" : "SMA(5)"]} contentStyle={{ background: "#0b1526", border: "1px solid #ffffff12", borderRadius: 12, fontSize: 11 }} />
            <ReferenceLine y={parseFloat(t.tp)} stroke="#10b981" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `TP ${t.tp}`, fill: "#10b981", fontSize: 9, position: "insideRight" }} />
            <ReferenceLine y={parseFloat(t.sl)} stroke="#f43f5e" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `SL ${t.sl}`, fill: "#f43f5e", fontSize: 9, position: "insideRight" }} />
            <ReferenceLine y={parseFloat(t.entry)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Entry", fill: "#f59e0b", fontSize: 9, position: "insideRight" }} />
            <Area type="monotone" dataKey="v" stroke={c.hex} strokeWidth={2.5} fill="url(#pcg)" dot={false} />
            <Line type="monotone" dataKey="sma" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Key levels */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Key Levels</p>
        </div>
        <div className="space-y-3">
          {[
            { label: "Resistance", value: "1.0950", pct: 85, color: "text-rose-400", bar: "bg-rose-500", desc: "Overhead supply — sellers dominate here." },
            { label: "Current Price", value: PRICE[pair], pct: 50, color: c.text, bar: c.bar, desc: "Live market price." },
            { label: "Support", value: "1.0720", pct: 15, color: "text-emerald-400", bar: "bg-emerald-500", desc: "Demand zone — buyers step in here." },
          ].map(l => (
            <div key={l.label} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-28 shrink-0">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{l.label}</p>
                  <p className={`font-mono text-base font-black ${l.color}`}>{l.value}</p>
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className={`h-full ${l.bar} rounded-full`} style={{ width: `${l.pct}%` }} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Indicators & Radar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Indicators</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Trend", value: "Sideways", color: c.text },
              { label: "RSI (14)", value: "52", color: "text-white", note: "Neutral" },
              { label: "Pattern", value: "Awaiting signal", color: c.text },
              { label: "Volume", value: "Average", color: "text-white" },
              ...(pd.agents.correlation?.available ? [{ label: "Sharpe Ratio", value: pd.agents.correlation.sharpe?.toFixed(3) ?? "N/A", color: (pd.agents.correlation.sharpe ?? 0) > 0 ? "text-emerald-400" : "text-rose-400" }] : []),
              ...(pd.agents.correlation?.available ? [{ label: "Regime Score", value: `${((pd.agents.correlation.regime ?? 0) * 100).toFixed(1)}%`, color: "text-blue-400" }] : []),
            ].map(ind => (
              <div key={ind.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                <p className="text-xs text-slate-500">{ind.label}</p>
                <div className="text-right">
                  <p className={`text-xs font-black ${ind.color}`}>{ind.value}</p>
                  {"note" in ind && <p className="text-[9px] text-slate-600">{ind.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Signal Radar</p>
            {pd.lastUpdated && <span className="ml-auto text-[9px] text-blue-400">Live data</span>}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <RadarChart data={radarData} outerRadius={72}>
              <PolarGrid stroke="#ffffff0c" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
              <ReRadar name={pair} dataKey="value" stroke={c.hex} fill={c.hex} fillOpacity={0.12} strokeWidth={2} dot={{ fill: c.hex, r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/[0.05]">
            {radarData.map(d => (
              <div key={d.subject} className="text-center">
                <p className="text-[8px] text-slate-600 mb-0.5">{d.subject}</p>
                <p className={`text-xs font-black ${c.text}`}>{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeframe votes */}
      {tfVotes && Object.keys(tfVotes).length > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Live Timeframe Votes</p>
            <span className="ml-auto text-[9px] text-emerald-400">from technical agent</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(tfVotes).map(([tf, votes]) => {
              const best = Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b);
              const bestSig = best[0].toUpperCase() as any;
              const bc = sc(bestSig);
              return (
                <div key={tf} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <span className="text-xs font-black text-slate-400 w-8 shrink-0">{tf}</span>
                  <SignalPill s={bestSig} size="sm" />
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    {(["buy", "hold", "sell"] as const).map(k => (
                      <div key={k} className="text-center">
                        <p className="text-[8px] text-slate-600">{k.toUpperCase()}</p>
                        <p className={`text-[10px] font-black ${k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"}`}>{((votes[k] ?? 0) * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}