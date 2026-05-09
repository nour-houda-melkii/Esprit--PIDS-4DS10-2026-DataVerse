"use client"

// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT: ScenariosTab with LLM-generated dynamic scenarios
// Replace the static SCENARIOS array and ScenariosTab in your overview page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  FlaskConical, Info, CheckCircle, AlertTriangle, Shield, Minus,
  ChevronRight, RefreshCw, Loader2, WifiOff, Sparkles,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type Pair = "EUR/USD" | "GBP/USD" | "USD/JPY" | "USD/CHF" | "EUR/GBP" | "GBP/JPY"

type PairEffect = {
  direction:  -1 | 0 | 1
  magnitude:  number
}

type Scenario = {
  id:             string
  name:           string
  emoji:          string
  probability:    number
  shockType:      "bullish" | "bearish" | "neutral"
  shockMagnitude: number
  description:    string
  macroContext:   string
  triggerEvent:   string
  pairEffects:    Record<string, PairEffect>
}

type LivePairData = {
  signal:      "BUY" | "SELL" | "HOLD"
  conviction:  number
  growth:      number
  loading:     boolean
  error:       string | null
  lastUpdated: Date | null
  [key: string]: any
}

// ─── Static fallback scenarios (used while loading or on error) ───────────────

const FALLBACK_SCENARIOS: Scenario[] = [
  {
    id: "fed_hawkish", name: "Fed Hawkish Surprise", emoji: "🏦", probability: 28,
    shockType: "bearish", shockMagnitude: 0.72,
    description: "Fed signals rates stay higher for longer, reversing cut expectations. USD rallies hard.",
    macroContext: "DXY spikes above 104. US 10Y yields jump 25–35bp. Risk assets sell off globally.",
    triggerEvent: "FOMC minutes, hawkish Fed speaker, or US CPI beats by 0.3%+",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.80 },
      "GBP/USD": { direction: -1, magnitude: 0.75 },
      "USD/JPY": { direction:  1, magnitude: 0.85 },
      "USD/CHF": { direction:  1, magnitude: 0.70 },
      "EUR/GBP": { direction:  0, magnitude: 0.10 },
      "GBP/JPY": { direction:  1, magnitude: 0.60 },
    },
  },
  {
    id: "risk_off", name: "Global Risk-Off Shock", emoji: "⚡", probability: 18,
    shockType: "bearish", shockMagnitude: 0.88,
    description: "Geopolitical escalation triggers flight to safety into JPY and CHF.",
    macroContext: "JPY and CHF surge. VIX spikes above 25. Equities fall 3%+.",
    triggerEvent: "Major equity index drops 3%+ intraday, VIX spikes above 25",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.40 },
      "GBP/USD": { direction: -1, magnitude: 0.80 },
      "USD/JPY": { direction: -1, magnitude: 0.92 },
      "USD/CHF": { direction: -1, magnitude: 0.82 },
      "EUR/GBP": { direction:  1, magnitude: 0.50 },
      "GBP/JPY": { direction: -1, magnitude: 0.96 },
    },
  },
  {
    id: "soft_landing", name: "US Soft Landing", emoji: "🌤️", probability: 42,
    shockType: "bullish", shockMagnitude: 0.55,
    description: "US inflation cools while labour market stays resilient. Rate cut expectations firm.",
    macroContext: "USD weakens moderately. EUR, GBP recover. Carry trades rewarded.",
    triggerEvent: "CPI MoM below 0.2% + NFP 150–200K + dovish Fed tone",
    pairEffects: {
      "EUR/USD": { direction:  1, magnitude: 0.65 },
      "GBP/USD": { direction:  1, magnitude: 0.55 },
      "USD/JPY": { direction: -1, magnitude: 0.40 },
      "USD/CHF": { direction: -1, magnitude: 0.50 },
      "EUR/GBP": { direction:  0, magnitude: 0.15 },
      "GBP/JPY": { direction:  1, magnitude: 0.45 },
    },
  },
]

// ─── Static data referenced from the parent page ─────────────────────────────

const CONVICTION_STATIC: Record<Pair, number> = {
  "EUR/USD": 74, "GBP/USD": 68, "USD/JPY": 82,
  "USD/CHF": 52, "EUR/GBP": 70, "GBP/JPY": 78,
}

const PRICE: Record<Pair, string> = {
  "EUR/USD": "1.0842", "GBP/USD": "1.2618", "USD/JPY": "151.34",
  "USD/CHF": "0.9021", "EUR/GBP": "0.8591", "GBP/JPY": "190.98",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function sc(s: "BUY" | "SELL" | "HOLD") {
  return {
    BUY:  { hex: "#10b981", bar: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10" },
    SELL: { hex: "#f43f5e", bar: "bg-rose-500",    text: "text-rose-400",    border: "border-rose-500/40",    bg: "bg-rose-500/10"    },
    HOLD: { hex: "#f59e0b", bar: "bg-amber-500",   text: "text-amber-400",   border: "border-amber-500/40",   bg: "bg-amber-500/10"   },
  }[s]
}

function computeOutcome(
  pair:     string,
  signal:   "BUY" | "SELL" | "HOLD",
  baseGrowth: number,
  scenario: Scenario,
  capital:  number,
) {
  const effect    = scenario.pairEffects[pair] ?? { direction: 0, magnitude: 0.3 }
  const signalDir = signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0
  const alignment = signalDir * effect.direction
  const shockImpact    = effect.magnitude * scenario.shockMagnitude
  const adjustedGrowth = baseGrowth + alignment * shockImpact * 3.5
  const survival    = Math.max(0.10, Math.min(0.97, 0.55 + alignment * 0.20 + (1 - scenario.shockMagnitude) * 0.15))
  const baseConv    = (CONVICTION_STATIC[pair as Pair] ?? 60) / 100
  const confidence  = Math.max(0.10, Math.min(0.98, baseConv + alignment * 0.15 - (1 - survival) * 0.20))
  const decision: "PROCEED" | "REDUCE" | "SKIP" | "HOLD" =
    signal === "HOLD" ? "HOLD"
    : confidence >= 0.70 && survival >= 0.60 ? "PROCEED"
    : confidence >= 0.50 || survival >= 0.45  ? "REDUCE"
    : "SKIP"
  return {
    adjustedGrowth,
    capitalOutcome: capital * (1 + adjustedGrowth / 100),
    gainLoss:       capital * (adjustedGrowth / 100),
    confidence,
    survival,
    decision,
  }
}

// ─── DecisionBadge ────────────────────────────────────────────────────────────

function DecisionBadge({ d }: { d: "PROCEED" | "REDUCE" | "SKIP" | "HOLD" }) {
  const m = {
    PROCEED: { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", I: CheckCircle },
    REDUCE:  { cls: "bg-amber-500/10  border-amber-500/30  text-amber-400",    I: AlertTriangle },
    SKIP:    { cls: "bg-rose-500/10   border-rose-500/30   text-rose-400",     I: Shield },
    HOLD:    { cls: "bg-slate-500/10  border-slate-500/30  text-slate-400",    I: Minus },
  }[d]
  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black ${m.cls}`}>
      <m.I className="h-3.5 w-3.5" />{d}
    </span>
  )
}

// ─── useDynamicScenarios hook ─────────────────────────────────────────────────

function useDynamicScenarios(pair: Pair, signal: "BUY" | "SELL" | "HOLD", conviction: number, growth: number) {
  const [scenarios,  setScenarios]  = useState<Scenario[]>(FALLBACK_SCENARIOS)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [generated,  setGenerated]  = useState(false)
  const [lastPair,   setLastPair]   = useState<string | null>(null)

  const fetchScenarios = useCallback(async (force = false) => {
    // Only re-fetch when pair changes or forced refresh
    if (!force && lastPair === pair && generated) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/scenarios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          signal,
          conviction,
          growth,
          price: PRICE[pair],
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      if (data.scenarios && data.scenarios.length >= 1) {
        setScenarios(data.scenarios)
        setGenerated(true)
        setLastPair(pair)
      } else {
        throw new Error("No scenarios returned")
      }
    } catch (err: any) {
      console.error("Scenario fetch failed:", err)
      setError(err.message)
      // Keep using fallback scenarios on error
      setScenarios(FALLBACK_SCENARIOS)
    } finally {
      setLoading(false)
    }
  }, [pair, signal, conviction, growth, lastPair, generated])

  // Fetch when pair changes
  useEffect(() => {
    fetchScenarios()
  }, [pair]) // eslint-disable-line react-hooks/exhaustive-deps

  return { scenarios, loading, error, generated, refetch: () => fetchScenarios(true) }
}

// ─── ScenariosTab ─────────────────────────────────────────────────────────────

export function ScenariosTab({
  pair,
  capital,
  portfolioPairs,
  liveData,
}: {
  pair:           Pair
  capital:        number
  portfolioPairs: Pair[]
  liveData:       Record<string, LivePairData>
}) {
  const pd      = liveData[pair]
  const sig     = pd?.signal     ?? "HOLD"
  const growth  = pd?.growth     ?? 0
  const conv    = pd?.conviction ?? 50

  const { scenarios, loading, error, generated, refetch } = useDynamicScenarios(pair, sig, conv, growth)

  const [activeId,   setActiveId]   = useState<string>(scenarios[0]?.id ?? "")
  const [showSteps,  setShowSteps]  = useState(false)

  // Sync activeId when new scenarios arrive
  useEffect(() => {
    if (scenarios.length > 0 && !scenarios.find(s => s.id === activeId)) {
      setActiveId(scenarios[0].id)
      setShowSteps(false)
    }
  }, [scenarios]) // eslint-disable-line react-hooks/exhaustive-deps

  const scenario = scenarios.find(s => s.id === activeId) ?? scenarios[0]
  const outcome  = useMemo(
    () => scenario ? computeOutcome(pair, sig, growth, scenario, capital) : null,
    [pair, sig, growth, activeId, capital, scenarios],
  )

  const allOut = scenarios.map(s => ({
    name: s.name.split(" ")[0],
    conf: scenario ? Math.round(computeOutcome(pair, sig, growth, s, capital).confidence * 100) : 0,
    surv: scenario ? Math.round(computeOutcome(pair, sig, growth, s, capital).survival  * 100) : 0,
  }))

  if (!scenario || !outcome) return null

  return (
    <div className="space-y-5">

      {/* ── Header explainer ───────────────────────────────────────── */}
      <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-blue-400" />
            <p className="text-sm font-black text-white">What-If Scenario Engine</p>
            {generated && !loading && (
              <span className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[9px] font-black text-purple-400">
                <Sparkles className="h-2.5 w-2.5" />AI GENERATED
              </span>
            )}
            {!generated && !loading && (
              <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                STATIC FALLBACK
              </span>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={refetch}
            disabled={loading}
            title="Regenerate scenarios with AI"
            className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
          >
            {loading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <RefreshCw className="h-3 w-3" />
            }
            {loading ? "Generating…" : "Regenerate"}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {loading
            ? `ARIA is analysing current ${pair} macro environment and generating tailored scenarios…`
            : generated
            ? `Scenarios generated by ARIA specifically for ${pair} ${sig} signal at ${conv}% conviction. ${pd?.lastUpdated ? "Based on live prediction data." : ""}`
            : `Select a macro shock to see how your ${pair} trade performs. Click Regenerate to get AI-tailored scenarios.`
          }
        </p>

        {/* Error notice */}
        {error && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <p className="text-[10px] text-rose-400">
              AI generation failed — showing static fallbacks. {error.includes("500") ? "LLM API error." : error}
            </p>
          </div>
        )}
      </div>

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-xl bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-white/[0.06]" />
                  <div className="h-3 w-full rounded bg-white/[0.04]" />
                  <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Scenario selector cards ────────────────────────────────── */}
      {!loading && (
        <div className="space-y-2.5">
          {scenarios.map(s => {
            const active = s.id === activeId
            const o      = computeOutcome(pair, sig, growth, s, capital)
            const bdr    = s.shockType === "bullish"
              ? "border-emerald-500/35 bg-emerald-500/[0.04]"
              : s.shockType === "bearish"
              ? "border-rose-500/35 bg-rose-500/[0.04]"
              : "border-amber-500/35 bg-amber-500/[0.04]"
            return (
              <div
                key={s.id}
                className={`rounded-3xl border transition-all overflow-hidden cursor-pointer ${
                  active ? bdr : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
                onClick={() => { setActiveId(s.id); setShowSteps(false) }}
              >
                <div className="flex items-start gap-4 p-5">
                  <span className="text-3xl mt-0.5 shrink-0">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-black text-white">{s.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                          s.shockType === "bullish" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : s.shockType === "bearish" ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                          : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }`}>
                          {s.shockType.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500">{s.probability}% prob.</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>

                    {active && (
                      <>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          <span className="text-slate-400 font-semibold">Trigger: </span>
                          {s.triggerEvent}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {[
                            {
                              l: "Confidence",
                              v: `${Math.round(o.confidence * 100)}%`,
                              col: o.confidence >= 0.7 ? "text-emerald-400" : o.confidence >= 0.5 ? "text-amber-400" : "text-rose-400",
                            },
                            { l: "Survival",  v: `${Math.round(o.survival * 100)}%`,                                          col: "text-blue-400" },
                            { l: "Return",    v: `${o.adjustedGrowth >= 0 ? "+" : ""}${o.adjustedGrowth.toFixed(1)}%`,        col: o.adjustedGrowth >= 0 ? "text-emerald-400" : "text-rose-400" },
                          ].map(m => (
                            <div key={m.l} className="rounded-xl bg-black/30 p-2.5 text-center">
                              <p className="text-[9px] text-slate-600 mb-0.5">{m.l}</p>
                              <p className={`text-sm font-black ${m.col}`}>{m.v}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Detailed outcome ───────────────────────────────────────── */}
      {!loading && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
          <div className="p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Outcome — {scenario.name}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Macro Impact</p>
                <p className="text-xs text-slate-400 leading-relaxed">{scenario.macroContext}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Trigger Event</p>
                <p className="text-xs text-slate-400 leading-relaxed">{scenario.triggerEvent}</p>
              </div>
            </div>

            {/* Confidence & survival bars */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              {[
                {
                  label: "Trade Confidence", note: "≥70% = Proceed",
                  value: Math.round(outcome.confidence * 100),
                  color: outcome.confidence >= 0.7 ? "bg-emerald-500" : outcome.confidence >= 0.5 ? "bg-amber-500" : "bg-rose-500",
                },
                {
                  label: "Profitable Path Survival", note: "≥60% = Proceed",
                  value: Math.round(outcome.survival * 100),
                  color: "bg-blue-500",
                },
              ].map(bar => (
                <div key={bar.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-400">{bar.label}</span>
                    <span className="text-[10px] text-slate-600">{bar.note}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.value}%` }} />
                    </div>
                    <span className="text-xs font-black text-white w-9 text-right">{bar.value}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Capital */}
            <div className="grid grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
              {[
                { l: "Current",        v: `$${fmt(capital)}`,                                                                               col: "text-white" },
                { l: "Under Scenario", v: `$${fmt(outcome.capitalOutcome, 0)}`,                                                             col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
                { l: "Net Change",     v: `${outcome.gainLoss >= 0 ? "+" : "−"}$${fmt(Math.abs(outcome.gainLoss), 0)}`,                    col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
              ].map(s => (
                <div key={s.l} className="bg-[#0b1526] p-4 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">{s.l}</p>
                  <p className={`text-base font-black ${s.col}`}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Decision + step-by-step */}
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <div>
                <p className="text-[9px] text-slate-600 mb-2">ARIA Recommendation</p>
                <DecisionBadge d={outcome.decision} />
              </div>
              <button
                onClick={() => setShowSteps(v => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-blue-400 transition-all"
              >
                <Info className="h-3.5 w-3.5" />Decision logic
                <ChevronRight className={`h-3 w-3 transition-transform ${showSteps ? "rotate-90" : ""}`} />
              </button>
            </div>

            {showSteps && (
              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 mb-4">
                  Step-by-Step Decision Logic
                </p>
                <div className="space-y-3">
                  {[
                    `Scenario hits ${pair} with ${((scenario.pairEffects[pair]?.magnitude ?? 0) * scenario.shockMagnitude * 100).toFixed(0)}% effective shock intensity.`,
                    `Your ${sig} signal is ${outcome.adjustedGrowth >= growth ? "REINFORCED by" : "OPPOSED by"} this scenario direction.`,
                    `Adjusted return: base ${growth}% → ${outcome.adjustedGrowth >= 0 ? "+" : ""}${outcome.adjustedGrowth.toFixed(2)}%.`,
                    `Confidence ${Math.round(outcome.confidence * 100)}% vs 70% threshold → ${Math.round(outcome.confidence * 100) >= 70 ? "✓ PASS" : "✗ FAIL"}.`,
                    `Survival ${Math.round(outcome.survival * 100)}% vs 60% threshold → ${Math.round(outcome.survival * 100) >= 60 ? "✓ PASS" : "✗ FAIL"}.`,
                    `Final decision: ${outcome.decision}.`,
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[9px] font-black text-blue-400">
                        {i + 1}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Comparison chart ───────────────────────────────────────── */}
      {!loading && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs font-black text-white mb-1">Confidence vs Survival — All Scenarios</p>
          <p className="text-[10px] text-slate-600 mb-4">Dashed lines = minimum thresholds to PROCEED</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={allOut} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0b1526", border: "1px solid #ffffff12", borderRadius: 12, fontSize: 11 }}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" />
              <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="4 4" />
              <Bar dataKey="conf" name="Confidence" fill="#10b981" opacity={0.75} radius={[3, 3, 0, 0]} />
              <Bar dataKey="surv" name="Survival"   fill="#3b82f6" opacity={0.75} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}