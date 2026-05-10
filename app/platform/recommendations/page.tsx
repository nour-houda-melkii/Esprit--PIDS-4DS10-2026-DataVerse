"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Zap, RefreshCw, HelpCircle, AlertTriangle, ChevronLeft, ChevronRight,
  LayoutDashboard, Activity, Brain, FlaskConical, Globe,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLiveData } from "./hooks/useLiveData";
import { PortfolioCards } from "./components/ui/PortfolioCards";
import { PairSelector } from "./components/ui/PairSelector";
import { HelpPanel } from "./components/ui/HelpPanel";
import { OverviewTab, TechnicalTab, ReasoningTab, ScenariosTab, MacroTab } from "./components/tabs";
import { PAIRS, GROWTH_STATIC, SIGNAL_STATIC, PRICE, CHANGE, TIMEFRAME, CONVICTION_STATIC, FLAGS, PAIR_TO_API } from "./lib/constants";
import { Pair } from "./lib/types";
import { sc, fmt } from "./lib/utils";
import { SignalPill } from "./components/ui/SignalPill";

const TABS = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "technical", label: "Technical", icon: Activity        },
  { id: "reasoning", label: "Reasoning", icon: Brain           },
  { id: "scenarios", label: "Scenarios", icon: FlaskConical    },
  { id: "macro",     label: "Macro",     icon: Globe           },
] as const;
type Tab = (typeof TABS)[number]["id"];

interface IPortfolio {
  name: string;
  currencyPairs: string[];
  initialCapital: number;
  currency: string;
  riskLevel: "low" | "medium" | "high";
  tradingStyle: string;
}

const DEMO_PORTFOLIOS: IPortfolio[] = [
  { name: "All 6 Pairs",       currencyPairs: [...PAIRS],                              initialCapital: 30000, currency: "USD", riskLevel: "medium", tradingStyle: "swing"       },
  { name: "EUR Focus",         currencyPairs: ["EUR/USD", "EUR/JPY", "USD/CHF"],       initialCapital: 15000, currency: "USD", riskLevel: "low",    tradingStyle: "long-term"   },
  { name: "High Beta — Carry", currencyPairs: ["GBP/JPY", "USD/JPY", "GBP/USD"],      initialCapital: 10000, currency: "USD", riskLevel: "high",   tradingStyle: "day-trading" },
];

export default function RecommendationsPage() {
  const { user } = useAuth();
  const rawPortfolios = user?.portfolios as IPortfolio[] | undefined;
  const portfolios    = rawPortfolios?.length ? rawPortfolios : DEMO_PORTFOLIOS;
  const isDemo        = !rawPortfolios?.length;

  const [portfolioIdx, setPortfolioIdx] = useState(0);
  const [pair,         setPair        ] = useState<Pair>(PAIRS[0]);
  const [tab,          setTab         ] = useState<Tab>("overview");
  const [showHelp,     setShowHelp    ] = useState(false);

  const portfolio     = portfolios[portfolioIdx];
  const portfolioPairs = portfolio.currencyPairs.filter(p => PAIRS.includes(p as Pair)) as Pair[];
  const perPair        = portfolio.initialCapital / Math.max(portfolioPairs.length, 1);

  const { data: liveData, refetch, refetchAll } = useLiveData(portfolioPairs);

  const totalProjected = portfolioPairs.reduce(
    (s, p) => s + perPair * (1 + (liveData[p]?.growth ?? GROWTH_STATIC[p]) / 100), 0
  );
  const netPnL  = totalProjected - portfolio.initialCapital;
  const avgConv = portfolioPairs.length > 0
    ? Math.round(portfolioPairs.reduce((s, p) => s + (liveData[p]?.conviction ?? CONVICTION_STATIC[p]), 0) / portfolioPairs.length)
    : 0;
  const currentSig = liveData[pair]?.signal ?? SIGNAL_STATIC[pair];
  const c          = sc(currentSig);
  const anyLoading = portfolioPairs.some(p => liveData[p]?.loading);

  useEffect(() => {
    if (!portfolioPairs.includes(pair) && portfolioPairs.length > 0) {
      setPair(portfolioPairs[0]);
      setTab("overview");
    }
  }, [portfolioIdx, portfolioPairs, pair]);

  const handlePortfolioSelect = useCallback((i: number) => {
    setPortfolioIdx(i);
    const first = portfolios[i].currencyPairs.find(x => PAIRS.includes(x as Pair)) as Pair | undefined;
    if (first) { setPair(first); setTab("overview"); }
  }, [portfolios]);

  const handlePairChange = useCallback((p: Pair) => {
    setPair(p); setTab("overview");
  }, []);

  return (
    <div className="min-h-screen bg-[#040c18]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Ambient glow — follows signal colour */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl transition-all duration-1000"
          style={{ background: `radial-gradient(circle,${c.hex}10,transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-28">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">Portfolio Intelligence</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Central Brain v7 · 5-agent ensemble</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5">
              {anyLoading
                ? <RefreshCw className="h-2.5 w-2.5 text-blue-400 animate-spin" />
                : <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              <span className="text-[9px] font-bold text-emerald-400 tracking-widest">{anyLoading ? "FETCHING" : "LIVE"}</span>
            </div>
            <button onClick={refetchAll} disabled={anyLoading} title="Refresh all"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/20 disabled:opacity-40 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${anyLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowHelp(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/20 transition-colors">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── Demo banner ── */}
        {isDemo && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2.5 mb-6">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-xs text-slate-400">
              <span className="font-bold text-amber-400">Demo mode — </span>
              signals are real from your Azure API. Add portfolios to customise pair allocation.
            </p>
          </div>
        )}

        {/* ── Hero stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Balance",    value: `$${fmt(portfolio.initialCapital)}`,                                              color: "text-white"       },
            { label: "Projected",  value: `$${fmt(totalProjected, 0)}`,                                                    color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Net P&L",    value: `${netPnL >= 0 ? "+" : "−"}$${fmt(Math.abs(netPnL), 0)}`,                       color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Avg conviction", value: portfolioPairs.length > 0 ? `${avgConv}%` : "—",                            color: "text-blue-400"    },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">{s.label}</p>
              <p className={`text-xl font-black ${s.color} tabular-nums`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Two-column layout: sidebar + main ── */}
        <div className="flex gap-5">

          {/* Sidebar */}
          <div className="w-56 shrink-0 space-y-5">

            {/* Portfolio picker */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Portfolio</p>
              <div className="space-y-1.5">
                {portfolios.map((p, i) => (
                  <button
                    key={p.name}
                    onClick={() => handlePortfolioSelect(i)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                      i === portfolioIdx
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <p className={`text-xs font-bold truncate ${i === portfolioIdx ? "text-white" : "text-slate-400"}`}>{p.name}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">${fmt(p.initialCapital)} · {p.riskLevel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pair list */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Pairs</p>
              <div className="space-y-1">
                {portfolioPairs.map(p => {
                  const sig  = liveData[p]?.signal ?? SIGNAL_STATIC[p];
                  const conv = liveData[p]?.conviction ?? CONVICTION_STATIC[p];
                  const pc   = sc(sig);
                  const active = p === pair;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePairChange(p)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                        active
                          ? "border-white/[0.12] bg-white/[0.06]"
                          : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{FLAGS[p.split("/")[0]]}</span>
                        <span className={`text-xs font-mono font-bold ${active ? "text-white" : "text-slate-400"}`}>{p}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${pc.text}`}>{conv}%</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk + style metadata */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 space-y-2">
              {[
                { label: "Risk",  value: portfolio.riskLevel,   color: { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" }[portfolio.riskLevel] ?? "text-white" },
                { label: "Style", value: portfolio.tradingStyle, color: "text-slate-300" },
                { label: "Pairs", value: String(portfolioPairs.length), color: "text-white" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600">{s.label}</span>
                  <span className={`text-[10px] font-bold uppercase ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main panel ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Pair header card */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#060e1d]/80 backdrop-blur-sm overflow-hidden">
              <div className={`h-0.5 ${c.bar}`} />

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-11 w-11 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.09] shrink-0">
                    <span className="absolute -top-1.5 -left-1.5 text-lg">{FLAGS[pair.split("/")[0]]}</span>
                    <span className="absolute -bottom-1.5 -right-1.5 text-lg">{FLAGS[pair.split("/")[1]]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-base font-black text-white tracking-wide">{pair}</p>
                      <SignalPill s={liveData[pair]?.signal ?? SIGNAL_STATIC[pair]} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="font-mono text-xs text-slate-400">{PRICE[pair]}</p>
                      <p className={`text-xs font-mono ${CHANGE[pair] >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {CHANGE[pair] >= 0 ? "▲" : "▼"} {Math.abs(CHANGE[pair]).toFixed(4)}
                      </p>
                      <span className={`text-xs font-black ${c.text}`}>{liveData[pair]?.conviction ?? CONVICTION_STATIC[pair]}% conv.</span>
                    </div>
                  </div>
                </div>

                {/* Pair nav */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { const i = portfolioPairs.indexOf(pair); if (i > 0) { setPair(portfolioPairs[i-1]); setTab("overview"); } }}
                    disabled={portfolioPairs.indexOf(pair) <= 0}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/20 disabled:opacity-25 transition-all"
                  ><ChevronLeft className="h-3.5 w-3.5 text-slate-400" /></button>
                  <span className="text-[10px] text-slate-600 w-12 text-center">
                    {portfolioPairs.indexOf(pair)+1} / {portfolioPairs.length}
                  </span>
                  <button
                    onClick={() => { const i = portfolioPairs.indexOf(pair); if (i < portfolioPairs.length-1) { setPair(portfolioPairs[i+1]); setTab("overview"); } }}
                    disabled={portfolioPairs.indexOf(pair) >= portfolioPairs.length-1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/20 disabled:opacity-25 transition-all"
                  ><ChevronRight className="h-3.5 w-3.5 text-slate-400" /></button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-white/[0.06] flex overflow-x-auto scrollbar-none">
                {TABS.map(t => {
                  const active = t.id === tab;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 shrink-0 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                        active ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <t.icon className={`h-3 w-3 ${active ? "text-blue-400" : ""}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div key={`${pair}-${tab}`}>
              {tab === "overview"  && <OverviewTab  pair={pair} capital={perPair} portfolioPairs={portfolioPairs} liveData={liveData} onRefetch={refetch} />}
              {tab === "technical" && <TechnicalTab pair={pair} liveData={liveData} />}
              {tab === "reasoning" && <ReasoningTab pair={pair} liveData={liveData} />}
              {tab === "scenarios" && <ScenariosTab pair={pair} capital={perPair} portfolioPairs={portfolioPairs} liveData={liveData} />}
              {tab === "macro"     && <MacroTab     pair={pair} liveData={liveData} />}
            </div>
          </div>
        </div>
      </div>

      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}