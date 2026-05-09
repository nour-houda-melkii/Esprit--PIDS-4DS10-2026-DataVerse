"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Info, Shield, AlertTriangle, CheckCircle, Brain, Lightbulb,
  Activity, BarChart2, Target, Clock, X, ArrowUpRight, ArrowDownRight,
  Eye, Globe, FlaskConical, LayoutDashboard, ArrowRight,
  HelpCircle, Zap, Layers, ChevronDown, ChevronUp,
  Flame, Snowflake, Wind, Wallet, RefreshCw, Wifi, WifiOff,
  Loader2, Sparkles,
} from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar as ReRadar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, BarChart, Bar, Cell, CartesianGrid,
  ComposedChart, Line,
} from "recharts"
import { useAuth } from "@/lib/auth-context"

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, dec = 0) {
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// ─── pairs ────────────────────────────────────────────────────────────────────
const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "EUR/GBP", "GBP/JPY"] as const
type Pair = typeof PAIRS[number]
const FLAGS: Record<string, string> = { EUR: "🇪🇺", USD: "🇺🇸", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭" }

// ─── static fallbacks (used until live data loads) ────────────────────────────
const SIGNAL_STATIC: Record<Pair, "BUY" | "SELL" | "HOLD"> = {
  "EUR/USD": "BUY", "GBP/USD": "SELL", "USD/JPY": "BUY",
  "USD/CHF": "HOLD", "EUR/GBP": "BUY", "GBP/JPY": "BUY",
}
const GROWTH_STATIC: Record<Pair, number> = {
  "EUR/USD": 2.3, "GBP/USD": -1.1, "USD/JPY": 3.7,
  "USD/CHF": 0.4, "EUR/GBP": 1.4, "GBP/JPY": 2.9,
}
const CONVICTION_STATIC: Record<Pair, number> = {
  "EUR/USD": 74, "GBP/USD": 68, "USD/JPY": 82,
  "USD/CHF": 52, "EUR/GBP": 70, "GBP/JPY": 78,
}

const PRICE: Record<Pair, string> = {
  "EUR/USD": "1.0842", "GBP/USD": "1.2618", "USD/JPY": "151.34",
  "USD/CHF": "0.9021", "EUR/GBP": "0.8591", "GBP/JPY": "190.98",
}
const CHANGE: Record<Pair, number> = {
  "EUR/USD": 0.0024, "GBP/USD": -0.0038, "USD/JPY": 0.42,
  "USD/CHF": 0.0008, "EUR/GBP": 0.0015, "GBP/JPY": 0.87,
}
const TARGET: Record<Pair, { tp: string; sl: string; entry: string }> = {
  "EUR/USD": { entry: "1.0820", tp: "1.1090", sl: "1.0720" },
  "GBP/USD": { entry: "1.2660", tp: "1.2360", sl: "1.2750" },
  "USD/JPY": { entry: "151.00", tp: "153.80", sl: "149.50" },
  "USD/CHF": { entry: "0.9021", tp: "0.9080", sl: "0.8960" },
  "EUR/GBP": { entry: "0.8575", tp: "0.8710", sl: "0.8510" },
  "GBP/JPY": { entry: "190.50", tp: "196.00", sl: "187.50" },
}
const PIPS: Record<Pair, number> = { "EUR/USD": 248, "GBP/USD": 258, "USD/JPY": 246, "USD/CHF": 60, "EUR/GBP": 119, "GBP/JPY": 502 }
const RR: Record<Pair, string> = { "EUR/USD": "2.1:1", "GBP/USD": "1.9:1", "USD/JPY": "2.6:1", "USD/CHF": "1.2:1", "EUR/GBP": "1.8:1", "GBP/JPY": "2.4:1" }
const TIMEFRAME: Record<Pair, string> = { "EUR/USD": "4–12 hrs", "GBP/USD": "1–3 days", "USD/JPY": "1–5 days", "USD/CHF": "Watch only", "EUR/GBP": "2–5 days", "GBP/JPY": "2–7 days" }
const VOLATILITY: Record<Pair, "LOW" | "MEDIUM" | "HIGH"> = { "EUR/USD": "MEDIUM", "GBP/USD": "HIGH", "USD/JPY": "HIGH", "USD/CHF": "LOW", "EUR/GBP": "LOW", "GBP/JPY": "HIGH" }
const HISTORY: Record<Pair, number[]> = {
  "EUR/USD": [1.071,1.075,1.073,1.078,1.076,1.080,1.079,1.082,1.081,1.083,1.082,1.085,1.084,1.0842],
  "GBP/USD": [1.282,1.278,1.275,1.271,1.274,1.268,1.265,1.263,1.268,1.264,1.261,1.263,1.260,1.2618],
  "USD/JPY": [148.2,148.9,149.4,150.1,149.8,150.5,150.9,151.0,150.7,151.1,151.2,151.0,151.3,151.34],
  "USD/CHF": [0.898,0.901,0.899,0.903,0.901,0.902,0.900,0.903,0.901,0.902,0.902,0.901,0.903,0.9021],
  "EUR/GBP": [0.851,0.854,0.853,0.856,0.855,0.857,0.856,0.858,0.857,0.859,0.858,0.860,0.859,0.8591],
  "GBP/JPY": [186.1,187.4,188.0,188.9,188.5,189.2,189.8,190.1,189.7,190.3,190.5,190.7,190.9,190.98],
}
const RADAR: Record<Pair, Record<string, number>> = {
  "EUR/USD": { Technical: 78, Macro: 72, Sentiment: 68, Momentum: 74, Risk: 60 },
  "GBP/USD": { Technical: 80, Macro: 65, Sentiment: 55, Momentum: 70, Risk: 45 },
  "USD/JPY": { Technical: 85, Macro: 90, Sentiment: 72, Momentum: 88, Risk: 55 },
  "USD/CHF": { Technical: 50, Macro: 58, Sentiment: 48, Momentum: 40, Risk: 72 },
  "EUR/GBP": { Technical: 72, Macro: 75, Sentiment: 65, Momentum: 68, Risk: 62 },
  "GBP/JPY": { Technical: 80, Macro: 82, Sentiment: 78, Momentum: 85, Risk: 42 },
}

type ReasonData = {
  headline: string; summary: string
  factors: { label: string; detail: string; agent: string; strength: number }[]
  risks: { label: string; detail: string; severity: "HIGH" | "MEDIUM" | "LOW" }[]
  macro: { rate_base: string; rate_quote: string; differential: string; gdp_base: string; gdp_quote: string; inflation_base: string; inflation_quote: string }
  technical: { trend: string; support: string; resistance: string; rsi: number; pattern: string; volume: string }
  agents: string[]
}

const REASONING: Record<Pair, ReasonData> = {
  "EUR/USD": {
    headline: "ECB Pivot + DXY Weakness = Structural Upside",
    summary: "EUR is undervalued relative to USD as the ECB dovish pivot is only 60% priced in. Institutional money is accumulating EUR. Technical divergence on 4H confirms exhausted sellers.",
    factors: [
      { label: "ECB Dovish Pivot Incomplete", detail: "ECB signalled rate cuts but markets priced ~60% of the expected easing. As the remaining 40% gets priced in, EUR has asymmetric upside.", agent: "Macro", strength: 85 },
      { label: "RSI Bullish Divergence (4H)", detail: "Price printed a lower low while RSI printed a higher low — textbook bullish divergence. Historically this resolves with a 150–300 pip rally within 48 hours.", agent: "Technical", strength: 78 },
      { label: "Institutional Long Positioning (COT)", detail: "CFTC COT shows large speculators net-long EUR for 3 consecutive weeks with increasing size.", agent: "Sentiment", strength: 72 },
      { label: "DXY Double Rejection at 103.50", detail: "The US Dollar Index rejected below critical 103.50 resistance twice this month. EUR/USD has a -0.97 correlation with DXY.", agent: "Correlations", strength: 70 },
    ],
    risks: [
      { label: "Fed Hawkish Surprise", detail: "Any FOMC speaker reiterating higher-for-longer would sharply strengthen USD and invalidate this setup.", severity: "HIGH" },
      { label: "Eurozone GDP Miss", detail: "A weak Eurozone GDP print below 0.2% QoQ would undermine the EUR recovery thesis.", severity: "MEDIUM" },
    ],
    macro: { rate_base: "4.50% (ECB)", rate_quote: "5.25–5.50% (Fed)", differential: "-0.75%", gdp_base: "+0.3% QoQ", gdp_quote: "+3.3% QoQ", inflation_base: "2.8% CPI", inflation_quote: "3.4% CPI" },
    technical: { trend: "Bullish", support: "1.0720", resistance: "1.0950", rsi: 52, pattern: "Bullish Divergence (4H)", volume: "Above Average" },
    agents: ["Technical", "Macro", "Sentiment", "Correlations"],
  },
  "GBP/USD": {
    headline: "BoE Early Cut Risk + Bearish Engulfing at Key Resistance",
    summary: "GBP is structurally weak as the Bank of England signals cuts sooner than consensus expects. A bearish engulfing pattern at 1.2750 confirms strong institutional selling.",
    factors: [
      { label: "BoE Early Cut Signals", detail: "BoE MPC members have explicitly discussed rate cuts. Markets priced June; BoE language increasingly suggests May.", agent: "Macro", strength: 88 },
      { label: "Bearish Engulfing at 1.2750", detail: "Daily chart shows a bearish engulfing at the 1.2750 resistance on above-average volume.", agent: "Technical", strength: 82 },
      { label: "UK Retail Sales Miss (-0.4%)", detail: "UK Retail Sales came in at -0.4% MoM vs +0.2% expected — the third consecutive miss.", agent: "Macro", strength: 75 },
    ],
    risks: [
      { label: "Weak US NFP Data", detail: "A significant miss on US Non-Farm Payrolls could drag USD broadly lower.", severity: "HIGH" },
      { label: "UK Inflation Upside Surprise", detail: "A higher-than-expected UK CPI print would delay BoE rate cuts.", severity: "MEDIUM" },
    ],
    macro: { rate_base: "5.25% (BoE)", rate_quote: "5.25–5.50% (Fed)", differential: "0.00%", gdp_base: "+0.1% QoQ", gdp_quote: "+3.3% QoQ", inflation_base: "3.4% CPI", inflation_quote: "3.4% CPI" },
    technical: { trend: "Bearish", support: "1.2450", resistance: "1.2750", rsi: 61, pattern: "Bearish Engulfing (Daily)", volume: "Above Average" },
    agents: ["Technical", "Macro"],
  },
  "USD/JPY": {
    headline: "535bp Rate Gap Drives Relentless Carry Trade Demand",
    summary: "The 535bp gap between US (5.25%) and Japan (-0.1%) is at a 30-year high — making USD/JPY the premier carry trade. Price broke above the critical 151.00 level on strong volume.",
    factors: [
      { label: "BoJ Ultra-Loose Policy Confirmed", detail: "Bank of Japan reaffirmed ultra-accommodative policy. No rate hike expected until Q3 at earliest.", agent: "Macro", strength: 92 },
      { label: "535bp Rate Gap — 30-Year High", detail: "US Fed Funds (5.25%) vs BoJ (-0.10%) = 535bp differential. Carry trades extraordinarily profitable.", agent: "Macro", strength: 90 },
      { label: "Breakout Above 151.00 on Volume", detail: "Price broke the 151.00 major resistance on volume 40% above the 20-day average.", agent: "Technical", strength: 85 },
      { label: "No Safe-Haven JPY Bid", detail: "Current macro environment lacks a systemic risk-off catalyst.", agent: "Correlations", strength: 78 },
    ],
    risks: [
      { label: "BoJ Intervention Threat", detail: "MoF and BoJ intervened directly in 2022 above 145 and 150. Above 152.00, intervention risk is extreme.", severity: "HIGH" },
    ],
    macro: { rate_base: "5.25–5.50% (Fed)", rate_quote: "-0.10% (BoJ)", differential: "+5.35%", gdp_base: "+3.3% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "3.4% CPI", inflation_quote: "2.8% CPI" },
    technical: { trend: "Strongly Bullish", support: "149.50", resistance: "153.00", rsi: 68, pattern: "Breakout + Continuation", volume: "Above Average" },
    agents: ["Macro", "Technical", "Correlations"],
  },
  "USD/CHF": {
    headline: "Range-Bound — SNB Normalisation Removes Safe-Haven Premium",
    summary: "SNB rate normalisation removed CHF's safe-haven premium. USD/CHF has been in a tight range for 6 weeks with no clear breakout catalyst.",
    factors: [
      { label: "SNB Rate Normalisation", detail: "Swiss National Bank raised rates to +1.75%, removing the negative rate environment.", agent: "Macro", strength: 62 },
      { label: "6-Week Range Consolidation", detail: "USD/CHF has traded within a 140 pip range for 6 consecutive weeks.", agent: "Technical", strength: 55 },
    ],
    risks: [
      { label: "Sudden Risk-Off Event", detail: "CHF still attracts safe-haven flows during severe stress.", severity: "HIGH" },
      { label: "SNB Surprise Rate Cut", detail: "If SNB unexpectedly cuts, CHF would weaken significantly.", severity: "MEDIUM" },
    ],
    macro: { rate_base: "5.25–5.50% (Fed)", rate_quote: "1.75% (SNB)", differential: "+3.50%", gdp_base: "+3.3% QoQ", gdp_quote: "+0.3% QoQ", inflation_base: "3.4% CPI", inflation_quote: "1.2% CPI" },
    technical: { trend: "Sideways/Range", support: "0.8940", resistance: "0.9080", rsi: 50, pattern: "Range Consolidation", volume: "Below Average" },
    agents: ["Macro", "Technical"],
  },
  "EUR/GBP": {
    headline: "BoE Cuts Before ECB — Rate Divergence Drives Cross Higher",
    summary: "EUR/GBP captures BoE cutting first and faster than ECB. The 0.8550 long-term support held with a weekly pin bar reversal.",
    factors: [
      { label: "BoE Cuts Before ECB", detail: "BoE is expected to cut rates before and faster than the ECB.", agent: "Macro", strength: 80 },
      { label: "Relative GBP Weakness vs EUR", detail: "UK economic data has been consistently disappointing while Eurozone data has been less negative.", agent: "Macro", strength: 75 },
      { label: "Weekly Pin Bar at 0.8550", detail: "EUR/GBP held the critical 0.8550 long-term support — tested 6 times over 2 years.", agent: "Technical", strength: 72 },
    ],
    risks: [
      { label: "ECB Surprises with Early Cut", detail: "If ECB announces an unexpected early cut, EUR would weaken against GBP.", severity: "HIGH" },
      { label: "Broad USD Strength Drags EUR", detail: "A strong USD rally would drag EUR lower broadly.", severity: "MEDIUM" },
    ],
    macro: { rate_base: "4.50% (ECB)", rate_quote: "5.25% (BoE)", differential: "-0.75%", gdp_base: "+0.3% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "2.8% CPI", inflation_quote: "3.4% CPI" },
    technical: { trend: "Bullish Recovery", support: "0.8510", resistance: "0.8720", rsi: 54, pattern: "Pin Bar Reversal (Weekly)", volume: "Average" },
    agents: ["Macro", "Technical", "Sentiment"],
  },
  "GBP/JPY": {
    headline: "Risk Barometer — Amplified Carry Trade with Dual Tailwinds",
    summary: "GBP/JPY combines JPY structural weakness (BoJ ultra-loose) with GBP relative strength vs JPY. 80% of retail traders short — a powerful contrarian signal.",
    factors: [
      { label: "JPY Structural Weakness Dominates", detail: "Despite GBP being weak against USD, it is still far stronger than JPY.", agent: "Macro", strength: 88 },
      { label: "Clean Daily Uptrend — 3 Weeks", detail: "Daily chart shows 3 consecutive weeks of higher highs and higher lows.", agent: "Technical", strength: 84 },
      { label: "Positive Daily Carry Income", detail: "Holding GBP/JPY long earns ~$12–15 per standard lot per day.", agent: "Macro", strength: 78 },
      { label: "80% Retail Short — Contrarian Signal", detail: "80% of retail broker positions are short GBP/JPY. Extreme retail short is historically one of the most reliable contrarian signals.", agent: "Sentiment", strength: 82 },
    ],
    risks: [
      { label: "Risk-Off Event — Maximum Sensitivity", detail: "GBP/JPY is the most sensitive major pair to sudden risk-off events.", severity: "HIGH" },
      { label: "BoJ Surprise Hike or Intervention", detail: "An unexpected BoJ rate hike would spike JPY dramatically.", severity: "HIGH" },
    ],
    macro: { rate_base: "5.25% (BoE)", rate_quote: "-0.10% (BoJ)", differential: "+5.35%", gdp_base: "+0.1% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "3.4% CPI", inflation_quote: "2.8% CPI" },
    technical: { trend: "Strongly Bullish", support: "187.50", resistance: "196.00", rsi: 66, pattern: "Trend Continuation (Daily)", volume: "Above Average" },
    agents: ["Technical", "Macro", "Sentiment", "Correlations"],
  },
}

// ─── Scenario type ────────────────────────────────────────────────────────────
type PairEffect = {
  direction: -1 | 0 | 1
  magnitude: number
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

// ─── Fallback scenarios (used while loading or on error) ──────────────────────
const FALLBACK_SCENARIOS: Scenario[] = [
  {
    id: "fed_hawkish", name: "Fed Hawkish Surprise", emoji: "🏦", probability: 28,
    shockType: "bearish", shockMagnitude: 0.72,
    description: "Fed signals rates stay higher for longer, reversing cut expectations. USD rallies hard.",
    macroContext: "DXY spikes above 104. US 10Y yields jump 25–35bp. Risk assets sell off globally.",
    triggerEvent: "FOMC minutes, hawkish Fed speaker, or US CPI beats by 0.3%+",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.80 }, "GBP/USD": { direction: -1, magnitude: 0.75 },
      "USD/JPY": { direction:  1, magnitude: 0.85 }, "USD/CHF": { direction:  1, magnitude: 0.70 },
      "EUR/GBP": { direction:  0, magnitude: 0.10 }, "GBP/JPY": { direction:  1, magnitude: 0.60 },
    },
  },
  {
    id: "risk_off", name: "Global Risk-Off Shock", emoji: "⚡", probability: 18,
    shockType: "bearish", shockMagnitude: 0.88,
    description: "Geopolitical escalation triggers flight to safety into JPY and CHF.",
    macroContext: "JPY and CHF surge. VIX spikes above 25. Equities fall 3%+.",
    triggerEvent: "Major equity index drops 3%+ intraday, VIX spikes above 25",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.40 }, "GBP/USD": { direction: -1, magnitude: 0.80 },
      "USD/JPY": { direction: -1, magnitude: 0.92 }, "USD/CHF": { direction: -1, magnitude: 0.82 },
      "EUR/GBP": { direction:  1, magnitude: 0.50 }, "GBP/JPY": { direction: -1, magnitude: 0.96 },
    },
  },
  {
    id: "soft_landing", name: "US Soft Landing", emoji: "🌤️", probability: 42,
    shockType: "bullish", shockMagnitude: 0.55,
    description: "US inflation cools while labour market stays resilient. Rate cut expectations firm.",
    macroContext: "USD weakens moderately. EUR, GBP recover. Carry trades rewarded.",
    triggerEvent: "CPI MoM below 0.2% + NFP 150–200K + dovish Fed tone",
    pairEffects: {
      "EUR/USD": { direction:  1, magnitude: 0.65 }, "GBP/USD": { direction:  1, magnitude: 0.55 },
      "USD/JPY": { direction: -1, magnitude: 0.40 }, "USD/CHF": { direction: -1, magnitude: 0.50 },
      "EUR/GBP": { direction:  0, magnitude: 0.15 }, "GBP/JPY": { direction:  1, magnitude: 0.45 },
    },
  },
]

// ─── API response shape ───────────────────────────────────────────────────────
type PredictApiResponse = {
  signal: "BUY" | "SELL" | "HOLD"
  confidence: number
  probs: { buy: number; hold: number; sell: number }
  gated: boolean
  method: string
  reason: string
  explanation: string
  timestamp: string
  sentiment: {
    signal: string; confidence: number
    probs: { buy: number; hold: number; sell: number }
    model_votes: Record<string, string>; articles: number; available: boolean
  }
  correlation: {
    signal: string; confidence: number
    probs: { buy: number; hold: number; sell: number }
    sharpe: number; regime: number; score: number; available: boolean
  }
  geopolitical: {
    signal: string; confidence: number
    probs: { buy: number; hold: number; sell: number }
    model_votes: Record<string, string>; agreement: string; strength: string; available: boolean
  }
  technical: {
    signal: string; confidence: number
    probs: { buy: number; hold: number; sell: number }
    tf_votes: Record<string, string>; available: boolean
  }
  macro: {
    signal: string; confidence: number
    probs: { buy: number; hold: number; sell: number }
    pair_score: number; base_score: number; quote_score: number
    summary: string; drivers: string[]; available: boolean
  }
  error?: string
}

type LivePairData = {
  signal:      "BUY" | "SELL" | "HOLD"
  conviction:  number
  growth:      number
  loading:     boolean
  error:       string | null
  lastUpdated: Date | null
  articles:    number
  probs:       { buy: number; hold: number; sell: number } | null
  method:      string | null
  reason:      string | null
  explanation: string | null
  gated:       boolean
  agents: {
    sentiment?:    PredictApiResponse["sentiment"]
    correlation?:  PredictApiResponse["correlation"]
    geopolitical?: PredictApiResponse["geopolitical"]
    technical?:    PredictApiResponse["technical"]
    macro?:        PredictApiResponse["macro"]
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function mapSignal(s: string): "BUY" | "SELL" | "HOLD" {
  const u = s.toUpperCase()
  if (u === "BUY")  return "BUY"
  if (u === "SELL") return "SELL"
  return "HOLD"
}

function deriveGrowth(signal: "BUY" | "SELL" | "HOLD", confidence: number, staticGrowth: number): number {
  if (signal === "HOLD") return staticGrowth * 0.3
  const dir   = signal === "BUY" ? 1 : -1
  const scale = 0.5 + confidence * 4.5
  return parseFloat((dir * scale).toFixed(2))
}

function liveRadar(pair: Pair, probs: { buy: number; hold: number; sell: number } | null): Record<string, number> {
  const base = { ...RADAR[pair] }
  if (!probs) return base
  const sentimentScore = Math.round(Math.max(probs.buy, probs.sell, probs.hold) * 100)
  return { ...base, Sentiment: sentimentScore }
}

// ─── computeOutcome ───────────────────────────────────────────────────────────
function computeOutcome(
  pair:       string,
  signal:     "BUY" | "SELL" | "HOLD",
  baseGrowth: number,
  scenario:   Scenario,
  capital:    number,
) {
  const effect     = scenario.pairEffects[pair] ?? { direction: 0 as const, magnitude: 0.3 }
  const signalDir  = signal === "BUY" ? 1 : signal === "SELL" ? -1 : 0
  const alignment  = signalDir * effect.direction
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

// ─── signal colour helper ─────────────────────────────────────────────────────
function sc(s: "BUY" | "SELL" | "HOLD") {
  return {
    BUY:  { hex: "#10b981", bar: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10", dot: "bg-emerald-400", glow: "0 0 60px rgba(16,185,129,0.12)" },
    SELL: { hex: "#f43f5e", bar: "bg-rose-500",    text: "text-rose-400",    border: "border-rose-500/40",    bg: "bg-rose-500/10",    dot: "bg-rose-400",    glow: "0 0 60px rgba(244,63,94,0.12)" },
    HOLD: { hex: "#f59e0b", bar: "bg-amber-500",   text: "text-amber-400",   border: "border-amber-500/40",   bg: "bg-amber-500/10",   dot: "bg-amber-400",   glow: "0 0 60px rgba(245,158,11,0.12)" },
  }[s]
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE DATA HOOK
// ════════════════════════════════════════════════════════════════════════════
function useLiveData(pairs: Pair[]) {
  const [data, setData] = useState<Record<string, LivePairData>>(() => {
    const init: Record<string, LivePairData> = {}
    PAIRS.forEach(p => {
      init[p] = {
        signal:      SIGNAL_STATIC[p],
        conviction:  CONVICTION_STATIC[p],
        growth:      GROWTH_STATIC[p],
        loading:     false,
        error:       null,
        lastUpdated: null,
        articles:    0,
        probs:       null,
        method:      null,
        reason:      null,
        explanation: null,
        gated:       false,
        agents:      {},
      }
    })
    return init
  })

  const abortRefs = useRef<Record<string, AbortController>>({})

  const fetchPair = useCallback(async (pair: Pair) => {
    abortRefs.current[pair]?.abort()
    const ctrl = new AbortController()
    abortRefs.current[pair] = ctrl

    setData(prev => ({ ...prev, [pair]: { ...prev[pair], loading: true, error: null } }))

    try {
      const res = await fetch(`/api/predict?pair=${encodeURIComponent(pair)}&use_llm=true`, {
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: PredictApiResponse = await res.json()
      if (json.error) throw new Error(json.error)

      const signal     = json.signal
      const conviction = Math.round(json.confidence)
      const growth     = deriveGrowth(signal, json.confidence / 100, GROWTH_STATIC[pair])

      setData(prev => ({
        ...prev,
        [pair]: {
          signal, conviction, growth,
          loading:     false,
          error:       null,
          lastUpdated: new Date(),
          articles:    json.sentiment?.articles ?? 0,
          probs:       json.probs ?? null,
          method:      json.method ?? null,
          reason:      json.reason ?? null,
          explanation: json.explanation ?? null,
          gated:       json.gated ?? false,
          agents: {
            sentiment:    json.sentiment,
            correlation:  json.correlation,
            geopolitical: json.geopolitical,
            technical:    json.technical,
            macro:        json.macro,
          },
        },
      }))
    } catch (err: any) {
      if (err.name === "AbortError") return
      setData(prev => ({
        ...prev,
        [pair]: { ...prev[pair], loading: false, error: err.message ?? "Failed to fetch" },
      }))
    }
  }, [])

  useEffect(() => {
    pairs.forEach(p => fetchPair(p))
    return () => { Object.values(abortRefs.current).forEach(c => c.abort()) }
  }, [pairs.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch    = useCallback((pair: Pair) => fetchPair(pair), [fetchPair])
  const refetchAll = useCallback(() => pairs.forEach(p => fetchPair(p)), [pairs, fetchPair])

  return { data, refetch, refetchAll }
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE STATUS BADGE
// ════════════════════════════════════════════════════════════════════════════
function LiveBadge({ pairData, onRefetch }: { pairData: LivePairData; onRefetch: () => void }) {
  if (pairData.loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold text-blue-400">
        <RefreshCw className="h-2.5 w-2.5 animate-spin" />FETCHING
      </span>
    )
  }
  if (pairData.error) {
    return (
      <button
        onClick={onRefetch}
        title={`Error: ${pairData.error}. Click to retry.`}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
      >
        <WifiOff className="h-2.5 w-2.5" />RETRY
      </button>
    )
  }
  if (pairData.lastUpdated) {
    const mins = Math.floor((Date.now() - pairData.lastUpdated.getTime()) / 60000)
    return (
      <button
        onClick={onRefetch}
        title="Refresh live data"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
      >
        <Wifi className="h-2.5 w-2.5" />
        LIVE {mins > 0 ? `· ${mins}m ago` : "· just now"}
        {pairData.articles > 0 && ` · ${pairData.articles} art.`}
      </button>
    )
  }
  return null
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT SIGNALS PANEL
// ════════════════════════════════════════════════════════════════════════════
function AgentSignalsPanel({ agents }: { agents: LivePairData["agents"] }) {
  const availableAgents = Object.entries(agents).filter(([_, data]) => data?.available)
  if (availableAgents.length === 0) return null

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-3">
        Agent Consensus ({availableAgents.length} active)
      </p>
      {availableAgents.map(([name, data]) => {
        if (!data) return null
        const signal = (data.signal || "HOLD").toUpperCase() as "BUY" | "SELL" | "HOLD"
        const c = sc(signal)
        return (
          <div key={name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">{name}</span>
              <SignalPill s={signal} size="sm" />
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500">Confidence</span>
              <span className="text-[10px] font-black text-slate-400">
                {(data.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${data.confidence * 100}%` }} />
            </div>
            {data.probs && (
              <div className="grid grid-cols-3 gap-1 mt-2">
                {[
                  { label: "BUY",  key: "buy"  as const, color: "text-emerald-400" },
                  { label: "HOLD", key: "hold" as const, color: "text-amber-400" },
                  { label: "SELL", key: "sell" as const, color: "text-rose-400" },
                ].map(e => (
                  <div key={e.key} className="text-center">
                    <p className={`text-[9px] ${e.color}`}>{e.label}</p>
                    <p className="text-[9px] text-slate-500">{(data.probs![e.key] * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ATOMS
// ════════════════════════════════════════════════════════════════════════════
function SignalPill({ s, size = "md" }: { s: "BUY" | "SELL" | "HOLD"; size?: "sm" | "md" | "lg" }) {
  const c    = sc(s)
  const Icon = s === "BUY" ? TrendingUp : s === "SELL" ? TrendingDown : Minus
  const sz   = { sm: "px-2 py-0.5 text-[9px] gap-1", md: "px-3 py-1 text-[11px] gap-1.5", lg: "px-4 py-1.5 text-sm gap-2" }[size]
  return (
    <span className={`inline-flex items-center rounded-full border font-black tracking-widest ${sz} ${c.bg} ${c.border} ${c.text}`}>
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {s}
    </span>
  )
}

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

// ════════════════════════════════════════════════════════════════════════════
// PORTFOLIO CARDS
// ════════════════════════════════════════════════════════════════════════════
interface IPortfolio {
  name: string; currencyPairs: string[]
  initialCapital: number; currency: string
  riskLevel: "low" | "medium" | "high"; tradingStyle: string
}

function PortfolioCards({
  portfolios, active, onSelect, liveData,
}: { portfolios: IPortfolio[]; active: number; onSelect: (i: number) => void; liveData: Record<string, LivePairData> }) {
  const riskColor  = { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" }
  const riskBorder = { low: "border-emerald-500/25", medium: "border-amber-500/25", high: "border-rose-500/25" }
  const riskBg     = { low: "bg-emerald-500/[0.06]", medium: "bg-amber-500/[0.06]", high: "bg-rose-500/[0.06]" }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {portfolios.map((p, i) => {
        const isActive    = i === active
        const validPairs  = p.currencyPairs.filter(x => PAIRS.includes(x as Pair)) as Pair[]
        const netGrowth   = validPairs.length > 0
          ? validPairs.reduce((s, pair) => s + (liveData[pair]?.growth ?? GROWTH_STATIC[pair]), 0) / validPairs.length
          : 0
        const isPos = netGrowth >= 0

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`shrink-0 min-w-[200px] text-left rounded-2xl border p-5 transition-all duration-200 ${
              isActive
                ? "border-blue-500/50 bg-blue-500/[0.07] shadow-lg shadow-blue-500/10"
                : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <Wallet className="h-4 w-4 text-slate-400" />
              </div>
              {isActive && (
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black text-blue-400 tracking-widest">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm font-black text-white mb-1.5 leading-snug">{p.name}</p>
            <div className="flex items-center gap-1.5 mb-4">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${riskColor[p.riskLevel]} ${riskBorder[p.riskLevel]} ${riskBg[p.riskLevel]}`}>
                {p.riskLevel.toUpperCase()} RISK
              </span>
              <span className="text-[9px] text-slate-600">{p.tradingStyle}</span>
            </div>
            <div className="flex items-end justify-between pt-3 border-t border-white/[0.05]">
              <div>
                <p className="text-[9px] text-slate-600 mb-0.5">Balance</p>
                <p className="text-base font-black text-white">${fmt(p.initialCapital)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-600 mb-0.5">Expected</p>
                <p className={`text-sm font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {isPos ? "+" : ""}{netGrowth.toFixed(1)}%
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PAIR SELECTOR STRIP
// ════════════════════════════════════════════════════════════════════════════
function PairSelector({
  pairs, active, onChange, perPair, liveData, onRefetch,
}: { pairs: Pair[]; active: Pair; onChange: (p: Pair) => void; perPair: number; liveData: Record<string, LivePairData>; onRefetch: (p: Pair) => void }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pairs.map((p, idx) => {
          const pd      = liveData[p]
          const s       = pd.signal
          const c       = sc(s)
          const isActive = p === active
          const [base, quote] = p.split("/")
          const g    = pd.growth
          const conv = pd.conviction
          const change = CHANGE[p]
          const gain = perPair * (g / 100)

          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`group relative text-left rounded-2xl border transition-all duration-200 overflow-hidden ${
                isActive ? `${c.border} shadow-lg` : "border-white/[0.07] hover:border-white/[0.15]"
              }`}
              style={isActive
                ? { background: `linear-gradient(135deg, ${c.hex}14 0%, #070d1c 100%)`, boxShadow: c.glow }
                : { background: "rgba(255,255,255,0.02)" }
              }
            >
              {isActive && <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />}
              <div className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                isActive ? `${c.bg} ${c.text} border ${c.border}` : "bg-white/[0.05] text-slate-600"
              }`}>{idx + 1}</div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex shrink-0">
                    <span className="text-2xl leading-none">{FLAGS[base]}</span>
                    <span className="text-2xl leading-none -ml-1">{FLAGS[quote]}</span>
                  </div>
                  <div>
                    <p className={`font-mono text-sm font-black leading-none ${isActive ? c.text : "text-white"}`}>{p}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{TIMEFRAME[p]}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <SignalPill s={s} size="sm" />
                    {pd.loading && <RefreshCw className="h-2.5 w-2.5 text-blue-400 animate-spin" />}
                    {pd.error   && <WifiOff   className="h-2.5 w-2.5 text-rose-400" />}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-black text-white">{PRICE[p]}</p>
                    <p className={`text-[10px] font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">Conviction</span>
                    <span className={`text-[10px] font-black ${isActive ? c.text : "text-slate-400"}`}>{conv}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${c.bar} transition-all duration-700`}
                      style={{ width: `${conv}%`, opacity: isActive ? 1 : 0.45 }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/[0.05]">
                  {[
                    { label: "Capital", value: `$${Math.round(perPair / 1000)}k` },
                    { label: "Move",    value: `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`, colored: true, pos: g >= 0 },
                    { label: "P&L",     value: `${gain >= 0 ? "+" : "−"}$${Math.abs(gain) < 1000 ? Math.abs(gain).toFixed(0) : (Math.abs(gain)/1000).toFixed(1)+"k"}`, colored: true, pos: gain >= 0 },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="text-[8px] text-slate-600 mb-0.5">{stat.label}</p>
                      <p className={`text-[10px] font-black ${"colored" in stat && stat.colored ? (stat.pos ? "text-emerald-400" : "text-rose-400") : "text-white"}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 px-0.5">
        <p className="text-[10px] text-slate-600 shrink-0">{pairs.length} pair{pairs.length !== 1 ? "s" : ""} active</p>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <div className="flex gap-1.5">
          {pairs.map(p => {
            const s = liveData[p].signal, c = sc(s)
            return (
              <button key={p} onClick={() => onChange(p)} title={p}
                className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                  p === active ? `${c.border} ${c.bg}` : "border-white/[0.06] hover:border-white/[0.14]"
                }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — OVERVIEW
// ════════════════════════════════════════════════════════════════════════════
function OverviewTab({
  pair, capital, portfolioPairs, liveData, onRefetch,
}: { pair: Pair; capital: number; portfolioPairs: Pair[]; liveData: Record<string, LivePairData>; onRefetch: (p: Pair) => void }) {
  const pd    = liveData[pair]
  const sig   = pd.signal
  const c     = sc(sig)
  const g     = pd.growth
  const conv  = pd.conviction
  const price = PRICE[pair], change = CHANGE[pair], t = TARGET[pair]
  const r     = REASONING[pair]
  const histData   = HISTORY[pair].map((v, i) => ({ i, v }))
  const projected  = capital * (1 + g / 100)
  const gain       = projected - capital
  const allData    = portfolioPairs.map(p => ({ pair: p, g: liveData[p]?.growth ?? GROWTH_STATIC[p], fill: sc(liveData[p]?.signal ?? SIGNAL_STATIC[p]).hex }))
  const [showCalc, setShowCalc] = useState(false)

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border p-6"
        style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526 0%,#070d1c 100%)", boxShadow: c.glow }}>
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: c.hex }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.10] shrink-0">
                <span className="absolute -top-2 -left-1 text-2xl">{FLAGS[pair.split("/")[0]]}</span>
                <span className="absolute -bottom-2 -right-1 text-2xl">{FLAGS[pair.split("/")[1]]}</span>
              </div>
              <div>
                <p className="font-mono text-2xl font-black text-white tracking-wider">{pair}</p>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  <SignalPill s={sig} size="lg" />
                  <span className="text-[10px] text-slate-500">{TIMEFRAME[pair]}</span>
                  <LiveBadge pairData={pd} onRefetch={() => onRefetch(pair)} />
                  {pd.method && (
                    <span className="text-[9px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-bold">
                      {pd.method === "meta_model" ? "META-MODEL" : "RULE-BASED"}
                    </span>
                  )}
                  {pd.gated && (
                    <span className="text-[9px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold">
                      CONFIDENCE GATED
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Live Price</p>
              <p className="font-mono text-xl font-black text-white">{price}</p>
              <p className={`text-xs font-mono mt-0.5 ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(4)}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Conviction</p>
              <p className={`text-xs font-black ${c.text}`}>{conv}% — {conv >= 75 ? "High alignment" : conv >= 60 ? "Moderate signal" : "Cautious"}</p>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${conv}%` }} />
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${c.text}`}>{r.headline}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{r.summary}</p>
          </div>

          <div className="mt-4">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">14-Period Price</p>
            <ResponsiveContainer width="100%" height={50}>
              <AreaChart data={histData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id={`g-${pair}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c.hex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={c.hex} strokeWidth={2} fill={`url(#g-${pair})`} dot={false} isAnimationActive={false} />
                <YAxis domain={["auto", "auto"]} hide />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trade stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Clock,    label: "Timeframe",   value: TIMEFRAME[pair],  color: "text-white" },
          { icon: Target,   label: "Pip Target",  value: `~${PIPS[pair]}`, color: "text-white" },
          { icon: BarChart2, label: "Risk/Reward", value: RR[pair],         color: "text-white" },
          {
            icon: VOLATILITY[pair] === "HIGH" ? Flame : VOLATILITY[pair] === "LOW" ? Snowflake : Wind,
            label: "Volatility",
            value: VOLATILITY[pair],
            color: VOLATILITY[pair] === "HIGH" ? "text-rose-400" : VOLATILITY[pair] === "LOW" ? "text-sky-400" : "text-amber-400",
          },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <item.icon className="h-3.5 w-3.5" />
              <p className="text-[9px] uppercase tracking-wider">{item.label}</p>
            </div>
            <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Capital projection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Capital Projection</p>
          <button onClick={() => setShowCalc(!showCalc)} className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-blue-400 transition-colors">
            <Info className="h-3 w-3" />{showCalc ? "Hide" : "Show"} math
          </button>
        </div>
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
            {[
              { label: "Allocated",  value: `$${fmt(capital)}`,            sub: "Your split",                             color: "text-white" },
              { label: "Projected",  value: `$${fmt(projected, 0)}`,       sub: `${g >= 0 ? "+" : ""}${g.toFixed(1)}% growth`, color: g >= 0 ? "text-emerald-400" : "text-rose-400" },
              { label: "Net P&L",    value: `${gain >= 0 ? "+" : "−"}$${fmt(Math.abs(gain), 0)}`, sub: g >= 0 ? "profit" : "loss", color: gain >= 0 ? "text-emerald-400" : "text-rose-400" },
            ].map(s => (
              <div key={s.label} className="px-4 py-5 text-center">
                <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">{s.label}</p>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
            {[
              { Icon: ArrowRight,     label: "Entry",       value: TARGET[pair].entry, color: "text-slate-300" },
              { Icon: ArrowUpRight,   label: "Take Profit", value: TARGET[pair].tp,    color: "text-emerald-400" },
              { Icon: ArrowDownRight, label: "Stop Loss",   value: TARGET[pair].sl,    color: "text-rose-400" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-3 px-4 py-4">
                <l.Icon className={`h-5 w-5 shrink-0 ${l.color}`} />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-600">{l.label}</p>
                  <p className={`font-mono text-sm font-black mt-0.5 ${l.color}`}>{l.value}</p>
                </div>
              </div>
            ))}
          </div>
          {showCalc && (
            <div className="border-t border-white/[0.05] bg-black/20 px-5 py-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <span className="text-white font-bold">Math:</span>{" "}
                ${fmt(capital)} × (1 + {g >= 0 ? "+" : ""}{g.toFixed(1)}%) = ${fmt(projected, 0)} projected.
                {pd.lastUpdated
                  ? ` Signal derived from live AI prediction (${pd.articles} articles). Conviction ${conv}%.`
                  : ` Expected move derived from conviction (${conv}%) and volatility (${VOLATILITY[pair]}).`}
                Risk/Reward {RR[pair]}: for every $1 risked, ${RR[pair].split(":")[0]} is targeted.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison chart */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">All Pairs Comparison</p>
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-[10px] text-slate-600 mb-4">Expected return per pair — active pair highlighted</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={allData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" />
              <XAxis dataKey="pair" tick={{ fill: "#475569", fontSize: 8, fontWeight: 700 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(1)}%`, "Expected"]} contentStyle={{ background: "#0b1526", border: "1px solid #ffffff12", borderRadius: 12, fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#ffffff08" />
              <Bar dataKey="g" radius={[4, 4, 0, 0]}>
                {allData.map((e, i) => <Cell key={i} fill={e.fill} opacity={e.pair === pair ? 1 : 0.22} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — TECHNICAL
// ════════════════════════════════════════════════════════════════════════════
function TechnicalTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd   = liveData[pair]
  const sig  = pd.signal
  const c    = sc(sig)
  const tech = REASONING[pair].technical
  const t    = TARGET[pair]
  const hist = HISTORY[pair]
  const radarData  = Object.entries(liveRadar(pair, pd.probs)).map(([k, v]) => ({ subject: k, value: v, fullMark: 100 }))
  const priceData  = hist.map((v, i) => ({ i, v, sma: i >= 4 ? hist.slice(i - 4, i + 1).reduce((a, b) => a + b) / 5 : v }))
  const yMin = Math.min(parseFloat(t.sl), hist[0]) * 0.9993
  const yMax = Math.max(parseFloat(t.tp), hist[hist.length - 1]) * 1.0007

  return (
    <div className="space-y-5">
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
                <stop offset="5%"  stopColor={c.hex} stopOpacity={0.2} />
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
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.05]">
          {[{ col: c.hex, l: "Price" }, { col: "#64748b", l: "SMA(5)" }, { col: "#10b981", l: "Take Profit" }, { col: "#f43f5e", l: "Stop Loss" }, { col: "#f59e0b", l: "Entry" }].map(x => (
            <div key={x.l} className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ background: x.col }} />
              <span className="text-[10px] text-slate-500">{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Key Levels</p>
        </div>
        <div className="space-y-3">
          {[
            { label: "Resistance", value: tech.resistance, pct: 85, color: "text-rose-400", bar: "bg-rose-500", desc: "Overhead supply — sellers dominate here. A breakout is a strong bullish signal." },
            { label: "Current Price", value: PRICE[pair], pct: 50, color: c.text, bar: c.bar, desc: "Live market price — position between S/R tells you room to next level." },
            { label: "Support", value: tech.support, pct: 15, color: "text-emerald-400", bar: "bg-emerald-500", desc: "Demand zone — buyers step in here. A breakdown is bearish invalidation." },
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Indicators</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Trend",    value: tech.trend,   color: c.text },
              { label: "RSI (14)", value: String(tech.rsi), color: tech.rsi > 70 ? "text-rose-400" : tech.rsi < 30 ? "text-emerald-400" : "text-white", note: tech.rsi > 70 ? "Overbought" : tech.rsi < 30 ? "Oversold" : "Neutral" },
              { label: "Pattern",  value: tech.pattern, color: c.text },
              { label: "Volume",   value: tech.volume,  color: "text-white" },
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
            {pd.lastUpdated && <span className="ml-auto text-[9px] text-blue-400">Sentiment: live</span>}
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — REASONING
// ════════════════════════════════════════════════════════════════════════════
function ReasoningTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd  = liveData[pair]
  const sig = pd.signal
  const r   = REASONING[pair]
  const c   = sc(sig)
  const [openFactor, setOpenFactor] = useState<number | null>(null)
  const [openRisk,   setOpenRisk]   = useState<number | null>(null)
  const sv = {
    HIGH:   { cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
    MEDIUM: { cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    LOW:    { cls: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  }

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
        <div className={`rounded-2xl border p-4 ${c.bg} ${c.border} mb-4`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${c.text}`}>{r.headline}</p>
          <p className="text-xs text-slate-200 leading-relaxed">{r.summary}</p>
        </div>
        {pd.agents && Object.keys(pd.agents).length > 0 && <AgentSignalsPanel agents={pd.agents} />}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {r.agents.map(a => (
            <span key={a} className="rounded-full border border-blue-500/25 bg-blue-500/8 px-2.5 py-1 text-[9px] font-black text-blue-400">
              {a.toUpperCase()} AGENT
            </span>
          ))}
          {pd.lastUpdated && (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-1 text-[9px] font-black text-emerald-400">
              LIVE PREDICTION
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-black text-white">Why This Signal</p>
          <span className="ml-auto text-[10px] text-slate-600">Tap to expand</span>
        </div>
        <div className="space-y-2.5">
          {r.factors.map((f, i) => {
            const isOpen = openFactor === i
            return (
              <div key={i}
                className={`rounded-2xl border transition-all overflow-hidden cursor-pointer ${isOpen ? `${c.border} ${c.bg}` : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                onClick={() => setOpenFactor(isOpen ? null : i)}>
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
                    <div className="border-t border-white/[0.07] pt-4 space-y-3">
                      <p className="text-sm text-slate-300 leading-relaxed">{f.detail}</p>
                      <div className="rounded-xl bg-black/30 p-3">
                        <p className="text-[9px] text-slate-600 mb-1">Contribution strength</p>
                        <p className="text-xs text-slate-400">{f.strength >= 80 ? "Very strong — this factor alone justifies the signal." : f.strength >= 65 ? "Strong — a reliable component of the overall thesis." : "Moderate — contributes but not decisive alone."}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <p className="text-sm font-black text-white">What Could Invalidate This?</p>
        </div>
        <div className="space-y-2.5">
          {r.risks.map((risk, i) => {
            const s = sv[risk.severity]
            const isOpen = openRisk === i
            return (
              <div key={i}
                className={`rounded-2xl border transition-all overflow-hidden cursor-pointer ${isOpen ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                onClick={() => setOpenRisk(isOpen ? null : i)}>
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
                    <div className="border-t border-white/[0.07] pt-4 space-y-3">
                      <p className="text-sm text-slate-300 leading-relaxed">{risk.detail}</p>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70 mb-1">Recommended Response</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {risk.severity === "HIGH"
                            ? "Reduce position size 30–50% if this event is imminent. Set a hard stop and price alerts."
                            : "Monitor. Trailing stop provides protection. No immediate action unless event materialises."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// useDynamicScenarios HOOK
// ════════════════════════════════════════════════════════════════════════════
function useDynamicScenarios(
  pair:       Pair,
  signal:     "BUY" | "SELL" | "HOLD",
  conviction: number,
  growth:     number,
) {
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [lastPair,  setLastPair]  = useState<string | null>(null)

  const fetchScenarios = useCallback(async (force = false) => {
    if (!force && lastPair === pair && generated) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/scenarios", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, signal, conviction, growth, price: PRICE[pair] }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
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
      setScenarios(FALLBACK_SCENARIOS)
    } finally {
      setLoading(false)
    }
  }, [pair, signal, conviction, growth, lastPair, generated])

  useEffect(() => { fetchScenarios() }, [pair]) // eslint-disable-line react-hooks/exhaustive-deps

  return { scenarios, loading, error, generated, refetch: () => fetchScenarios(true) }
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — SCENARIOS (dynamic, LLM-powered)
// ════════════════════════════════════════════════════════════════════════════
function ScenariosTab({
  pair, capital, portfolioPairs, liveData,
}: { pair: Pair; capital: number; portfolioPairs: Pair[]; liveData: Record<string, LivePairData> }) {
  const pd   = liveData[pair]
  const sig  = pd?.signal     ?? "HOLD"
  const g    = pd?.growth     ?? 0
  const conv = pd?.conviction ?? 50

  const { scenarios, loading, error, generated, refetch } = useDynamicScenarios(pair, sig, conv, g)

  const [activeId,  setActiveId]  = useState<string>(scenarios[0]?.id ?? "")
  const [showSteps, setShowSteps] = useState(false)

  // Sync activeId when new scenarios arrive
  useEffect(() => {
    if (scenarios.length > 0 && !scenarios.find(s => s.id === activeId)) {
      setActiveId(scenarios[0].id)
      setShowSteps(false)
    }
  }, [scenarios]) // eslint-disable-line react-hooks/exhaustive-deps

  const scenario = scenarios.find(s => s.id === activeId) ?? scenarios[0]
  const outcome  = useMemo(
    () => scenario ? computeOutcome(pair, sig, g, scenario, capital) : null,
    [pair, sig, g, activeId, capital, scenarios], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const allOut = scenarios.map(s => ({
    name: s.name.split(" ")[0],
    conf: Math.round(computeOutcome(pair, sig, g, s, capital).confidence * 100),
    surv: Math.round(computeOutcome(pair, sig, g, s, capital).survival  * 100),
  }))

  if (!scenario || !outcome) return null

  return (
    <div className="space-y-5">

      {/* Header */}
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
            ? `Scenarios generated by ARIA specifically for ${pair} ${sig} signal at ${conv}% conviction.${pd?.lastUpdated ? " Based on live prediction data." : ""}`
            : `Select a macro shock to see how your ${pair} trade performs. Click Regenerate to get AI-tailored scenarios.`
          }
        </p>
        {error && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <p className="text-[10px] text-rose-400">
              AI generation failed — showing static fallbacks. {error.includes("500") ? "LLM API error." : error}
            </p>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
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

      {/* Scenario cards */}
      {!loading && (
        <div className="space-y-2.5">
          {scenarios.map(s => {
            const active = s.id === activeId
            const o      = computeOutcome(pair, sig, g, s, capital)
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
                            { l: "Confidence", v: `${Math.round(o.confidence * 100)}%`, col: o.confidence >= 0.7 ? "text-emerald-400" : o.confidence >= 0.5 ? "text-amber-400" : "text-rose-400" },
                            { l: "Survival",   v: `${Math.round(o.survival * 100)}%`,   col: "text-blue-400" },
                            { l: "Return",     v: `${o.adjustedGrowth >= 0 ? "+" : ""}${o.adjustedGrowth.toFixed(1)}%`, col: o.adjustedGrowth >= 0 ? "text-emerald-400" : "text-rose-400" },
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

      {/* Detailed outcome */}
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

            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              {[
                { label: "Trade Confidence",        note: "≥70% = Proceed", value: Math.round(outcome.confidence * 100), color: outcome.confidence >= 0.7 ? "bg-emerald-500" : outcome.confidence >= 0.5 ? "bg-amber-500" : "bg-rose-500" },
                { label: "Profitable Path Survival", note: "≥60% = Proceed", value: Math.round(outcome.survival  * 100), color: "bg-blue-500" },
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

            <div className="grid grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
              {[
                { l: "Current",        v: `$${fmt(capital)}`,                                                      col: "text-white" },
                { l: "Under Scenario", v: `$${fmt(outcome.capitalOutcome, 0)}`,                                     col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
                { l: "Net Change",     v: `${outcome.gainLoss >= 0 ? "+" : "−"}$${fmt(Math.abs(outcome.gainLoss), 0)}`, col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
              ].map(s => (
                <div key={s.l} className="bg-[#0b1526] p-4 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">{s.l}</p>
                  <p className={`text-base font-black ${s.col}`}>{s.v}</p>
                </div>
              ))}
            </div>

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
                    `Your ${sig} signal is ${outcome.adjustedGrowth >= g ? "REINFORCED by" : "OPPOSED by"} this scenario direction.`,
                    `Adjusted return: base ${g}% → ${outcome.adjustedGrowth >= 0 ? "+" : ""}${outcome.adjustedGrowth.toFixed(2)}%.`,
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

      {/* Comparison chart */}
      {!loading && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs font-black text-white mb-1">Confidence vs Survival — All Scenarios</p>
          <p className="text-[10px] text-slate-600 mb-4">Dashed lines = minimum thresholds to PROCEED</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={allOut} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0b1526", border: "1px solid #ffffff12", borderRadius: 12, fontSize: 11 }} />
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

// ════════════════════════════════════════════════════════════════════════════
// TAB — MACRO
// ════════════════════════════════════════════════════════════════════════════
function MacroTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd  = liveData[pair]
  const sig = pd.signal
  const r   = REASONING[pair]
  const c   = sc(sig)
  const [base, quote] = pair.split("/")
  const events = [
    { name: `${base === "EUR" ? "ECB" : base === "GBP" ? "Bank of England" : base === "USD" ? "Federal Reserve" : "Bank of Japan"} Rate Decision`, impact: "HIGH" as const, timing: "Next week", currency: base },
    { name: `${base} GDP Release`,                                                                                                                    impact: "HIGH"   as const, timing: "2 weeks", currency: base },
    { name: `${quote === "USD" ? "US CPI Inflation" : quote + " Inflation Data"}`,                                                                    impact: "HIGH"   as const, timing: "3 days",  currency: quote },
    { name: `${quote} Labour Market Report`,                                                                                                           impact: "MEDIUM" as const, timing: "4 days",  currency: quote },
    { name: `${base} Purchasing Managers Index`,                                                                                                       impact: "MEDIUM" as const, timing: "5 days",  currency: base },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border p-6" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-center gap-2 mb-5">
          <Globe className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Interest Rate Differential</p>
          <span className="ml-auto text-[10px] text-slate-600">Primary driver of currency flows</span>
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
            {sig === "BUY"
              ? `${base} has improving yield prospects relative to ${quote}. Capital flows naturally favour ${base}-denominated assets.`
              : sig === "SELL"
              ? `${quote} holds a yield advantage. Investors prefer ${quote}-denominated assets, pressuring ${pair} lower.`
              : `Rate differential is roughly balanced — no clear yield advantage. Watch for a decisive policy shift.`}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.07] bg-black/20">
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[base]} {base}</p></div>
          <div className="px-4 py-3 text-center border-x border-white/[0.07] min-w-[110px]"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Metric</p></div>
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[quote]} {quote}</p></div>
        </div>
        {[
          { metric: "Interest Rate", base: r.macro.rate_base,      quote: r.macro.rate_quote },
          { metric: "GDP Growth",    base: r.macro.gdp_base,        quote: r.macro.gdp_quote },
          { metric: "Inflation",     base: r.macro.inflation_base,  quote: r.macro.inflation_quote },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.04] last:border-0">
            <div className="px-5 py-4 text-center"><p className="text-sm font-black text-white">{row.base}</p></div>
            <div className="px-4 py-4 text-center border-x border-white/[0.04] min-w-[110px]"><p className="text-[9px] text-slate-600">{row.metric}</p></div>
            <div className="px-5 py-4 text-center"><p className="text-sm font-black text-white">{row.quote}</p></div>
          </div>
        ))}
      </div>

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
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${
                ev.impact === "HIGH"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}>{ev.impact}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// HELP PANEL
// ════════════════════════════════════════════════════════════════════════════
function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-[#060d1b] border-l border-white/[0.08] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <p className="text-sm font-black text-white">How This Works</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] hover:border-white/[0.2] transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            This is the <span className="font-bold text-blue-400">AI Signals & Scenario Engine</span> — a live dashboard showing exactly why each trade was recommended and how it performs in different macro environments.
          </p>
          <div className="space-y-3">
            {[
              { icon: LayoutDashboard, title: "Overview",   desc: "Signal, live price, conviction score, capital projection, entry/TP/SL levels, and pair comparison chart." },
              { icon: Activity,        title: "Technical",  desc: "Price action chart with TP/SL plotted, key support/resistance levels, indicators, and a 5-dimension signal radar." },
              { icon: Brain,           title: "Reasoning",  desc: "Every factor that drove the AI decision with contribution strength. Tap any card to read full detail. Live agent consensus shown when data is available." },
              { icon: FlaskConical,    title: "Scenarios",  desc: "AI-generated macro scenarios tailored to your pair and signal. ARIA calls the LLM to produce fresh scenarios on demand. Falls back to static defaults if unavailable." },
              { icon: Globe,           title: "Macro",      desc: "Interest rate differential, economic data comparison, and upcoming events that can move the pair." },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <item.icon className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">⚡ Live Predictions</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Signals are fetched live from your comprehensive AI prediction system combining 5 agents: Sentiment (NLP ensemble), Technical, Macro, Geopolitical, and Correlation analysis. Static fallbacks are used if the API is unreachable. Click any RETRY badge to re-fetch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TABS CONFIG
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "technical",  label: "Technical",  icon: Activity },
  { id: "reasoning",  label: "Reasoning",  icon: Brain },
  { id: "scenarios",  label: "Scenarios",  icon: FlaskConical },
  { id: "macro",      label: "Macro",      icon: Globe },
] as const
type Tab = typeof TABS[number]["id"]

// ════════════════════════════════════════════════════════════════════════════
// DEMO PORTFOLIOS
// ════════════════════════════════════════════════════════════════════════════
const DEMO_PORTFOLIOS: IPortfolio[] = [
  { name: "Major Pairs — Swing",       currencyPairs: [...PAIRS],                                   initialCapital: 30000, currency: "USD", riskLevel: "medium", tradingStyle: "swing" },
  { name: "Conservative — EUR Focus",  currencyPairs: ["EUR/USD", "EUR/GBP", "USD/CHF"],            initialCapital: 15000, currency: "USD", riskLevel: "low",    tradingStyle: "long-term" },
  { name: "Aggressive — High Beta",    currencyPairs: ["GBP/JPY", "USD/JPY", "GBP/USD"],            initialCapital: 10000, currency: "USD", riskLevel: "high",   tradingStyle: "day-trading" },
]

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function RecommendationsPage() {
  const { user } = useAuth()
  const rawPortfolios = user?.portfolios as IPortfolio[] | undefined
  const portfolios    = rawPortfolios?.length ? rawPortfolios : DEMO_PORTFOLIOS
  const isDemo        = !rawPortfolios?.length

  const [portfolioIdx, setPortfolioIdx] = useState(0)
  const [pair, setPair]                 = useState<Pair>(PAIRS[0])
  const [tab,  setTab]                  = useState<Tab>("overview")
  const [showHelp, setShowHelp]         = useState(false)

  const portfolio      = portfolios[portfolioIdx]
  const portfolioPairs = portfolio.currencyPairs.filter(p => PAIRS.includes(p as Pair)) as Pair[]
  const perPair        = portfolio.initialCapital / Math.max(portfolioPairs.length, 1)

  const { data: liveData, refetch, refetchAll } = useLiveData(portfolioPairs)

  const totalProjected = portfolioPairs.reduce(
    (s, p) => s + perPair * (1 + (liveData[p]?.growth ?? GROWTH_STATIC[p]) / 100), 0,
  )
  const netPnL  = totalProjected - portfolio.initialCapital
  const avgConv = portfolioPairs.length > 0
    ? Math.round(portfolioPairs.reduce((s, p) => s + (liveData[p]?.conviction ?? CONVICTION_STATIC[p]), 0) / portfolioPairs.length)
    : 0
  const c = sc(liveData[pair]?.signal ?? SIGNAL_STATIC[pair])

  useEffect(() => {
    if (!portfolioPairs.includes(pair) && portfolioPairs.length > 0) {
      setPair(portfolioPairs[0])
      setTab("overview")
    }
  }, [portfolioIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePortfolioSelect = useCallback((i: number) => {
    setPortfolioIdx(i)
    const p     = portfolios[i]
    const first = p.currencyPairs.find(x => PAIRS.includes(x as Pair)) as Pair | undefined
    if (first) { setPair(first); setTab("overview") }
  }, [portfolios])

  const handlePairChange = useCallback((p: Pair) => {
    setPair(p)
    setTab("overview")
  }, [])

  const anyLoading = portfolioPairs.some(p => liveData[p]?.loading)

  return (
    <div className="min-h-screen bg-[#040c18]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl transition-all duration-1000"
          style={{ background: `radial-gradient(circle,${c.hex}12,transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 pb-28 space-y-7">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Zap className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">AI Recommendations</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Portfolio Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">EUR · USD · JPY · CHF · GBP — 6 major pairs</p>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1.5">
              {anyLoading
                ? <RefreshCw className="h-2.5 w-2.5 text-blue-400 animate-spin" />
                : <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              }
              <span className="text-[9px] font-bold text-emerald-400 tracking-widest">
                {anyLoading ? "FETCHING" : "LIVE"}
              </span>
            </div>
            <button
              onClick={refetchAll}
              disabled={anyLoading}
              title="Refresh all pairs"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${anyLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-slate-400">
              <span className="font-bold text-amber-400">Demo mode — </span>
              illustrative data only. Add your portfolios to see live recommendations.
            </p>
          </div>
        )}

        {/* Portfolio switcher */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Your Portfolios</p>
          <PortfolioCards portfolios={portfolios} active={portfolioIdx} onSelect={handlePortfolioSelect} liveData={liveData} />
        </section>

        {/* Portfolio stats bar */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Balance",    value: `$${fmt(portfolio.initialCapital)}`,                                                           color: "text-white" },
            { label: "Projected",  value: `$${fmt(totalProjected, 0)}`,                                                                  color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Net P&L",    value: `${netPnL >= 0 ? "+" : "−"}$${fmt(Math.abs(netPnL), 0)}`,                                     color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Pairs",      value: String(portfolioPairs.length),                                                                  color: "text-white" },
            { label: "Risk Level", value: portfolio.riskLevel.toUpperCase(),                                                              color: { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" }[portfolio.riskLevel] ?? "text-white" },
            { label: "Avg Conv.",  value: portfolioPairs.length > 0 ? `${avgConv}%` : "—",                                               color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">{s.label}</p>
              <p className={`text-sm font-black ${s.color} truncate`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pair selector */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Your Pairs</p>
            <span className="text-[10px] text-slate-600">From {portfolio.name}</span>
          </div>
          <PairSelector pairs={portfolioPairs} active={pair} onChange={handlePairChange} perPair={perPair} liveData={liveData} onRefetch={refetch} />
        </section>

        {/* Active pair header + tabs */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#060e1d]/80 backdrop-blur-sm overflow-hidden">
          <div className={`h-0.5 ${c.bar}`} />
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.09] shrink-0">
                <span className="absolute -top-1.5 -left-1.5 text-xl">{FLAGS[pair.split("/")[0]]}</span>
                <span className="absolute -bottom-1.5 -right-1.5 text-xl">{FLAGS[pair.split("/")[1]]}</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="font-mono text-lg font-black text-white tracking-wide">{pair}</p>
                  <SignalPill s={liveData[pair]?.signal ?? SIGNAL_STATIC[pair]} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="font-mono text-sm text-slate-400">{PRICE[pair]}</p>
                  <p className={`text-xs font-mono ${CHANGE[pair] >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {CHANGE[pair] >= 0 ? "▲" : "▼"} {Math.abs(CHANGE[pair]).toFixed(4)}
                  </p>
                  <span className={`text-xs font-black ${c.text}`}>{liveData[pair]?.conviction ?? CONVICTION_STATIC[pair]}% conv.</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const i = portfolioPairs.indexOf(pair); if (i > 0) { setPair(portfolioPairs[i - 1]); setTab("overview") } }}
                disabled={portfolioPairs.indexOf(pair) <= 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-25 transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-slate-400" />
              </button>
              <span className="text-[10px] text-slate-600 w-14 text-center">
                {portfolioPairs.indexOf(pair) + 1} / {portfolioPairs.length}
              </span>
              <button
                onClick={() => { const i = portfolioPairs.indexOf(pair); if (i < portfolioPairs.length - 1) { setPair(portfolioPairs[i + 1]); setTab("overview") } }}
                disabled={portfolioPairs.indexOf(pair) >= portfolioPairs.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-25 transition-all"
              >
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-t border-white/[0.06] flex overflow-x-auto scrollbar-none">
            {TABS.map(t => {
              const active = t.id === tab
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 shrink-0 px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                    active ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}>
                  <t.icon className={`h-3.5 w-3.5 ${active ? "text-blue-400" : ""}`} />
                  {t.label}
                </button>
              )
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

      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}