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

// ─── Real API base URL ────────────────────────────────────────────────────────
const REAL_API_BASE = "https://pidsfx-app.greenforest-6c56574d.spaincentral.azurecontainerapps.io"

// ─── pairs ────────────────────────────────────────────────────────────────────
// Frontend uses slashes (EUR/USD), API uses no slash (EURUSD)
const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "EUR/JPY", "GBP/JPY"] as const
type Pair = typeof PAIRS[number]

// Maps frontend pair key → API pair key
const PAIR_TO_API: Record<Pair, string> = {
  "EUR/USD": "EURUSD",
  "GBP/USD": "GBPUSD",
  "USD/JPY": "USDJPY",
  "USD/CHF": "USDCHF",
  "EUR/JPY": "EURJPY",
  "GBP/JPY": "GBPJPY",
}

// Maps API pair key → frontend pair key
const API_TO_PAIR: Record<string, Pair> = Object.fromEntries(
  Object.entries(PAIR_TO_API).map(([k, v]) => [v, k as Pair])
) as Record<string, Pair>

const FLAGS: Record<string, string> = { EUR: "🇪🇺", USD: "🇺🇸", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭" }

// ─── static fallbacks (used until live data loads) ────────────────────────────
const SIGNAL_STATIC: Record<Pair, "BUY" | "SELL" | "HOLD"> = {
  "EUR/USD": "HOLD", "GBP/USD": "HOLD", "USD/JPY": "HOLD",
  "USD/CHF": "HOLD", "EUR/JPY": "HOLD", "GBP/JPY": "HOLD",
}
const GROWTH_STATIC: Record<Pair, number> = {
  "EUR/USD": 0, "GBP/USD": 0, "USD/JPY": 0,
  "USD/CHF": 0, "EUR/JPY": 0, "GBP/JPY": 0,
}
const CONVICTION_STATIC: Record<Pair, number> = {
  "EUR/USD": 45, "GBP/USD": 45, "USD/JPY": 45,
  "USD/CHF": 45, "EUR/JPY": 45, "GBP/JPY": 45,
}

const PRICE: Record<Pair, string> = {
  "EUR/USD": "1.0842", "GBP/USD": "1.2618", "USD/JPY": "151.34",
  "USD/CHF": "0.9021", "EUR/JPY": "163.21", "GBP/JPY": "190.98",
}
const CHANGE: Record<Pair, number> = {
  "EUR/USD": 0.0024, "GBP/USD": -0.0038, "USD/JPY": 0.42,
  "USD/CHF": 0.0008, "EUR/JPY": 0.31,    "GBP/JPY": 0.87,
}
const TARGET: Record<Pair, { tp: string; sl: string; entry: string }> = {
  "EUR/USD": { entry: "1.0820", tp: "1.1090", sl: "1.0720" },
  "GBP/USD": { entry: "1.2660", tp: "1.2360", sl: "1.2750" },
  "USD/JPY": { entry: "151.00", tp: "153.80", sl: "149.50" },
  "USD/CHF": { entry: "0.9021", tp: "0.9080", sl: "0.8960" },
  "EUR/JPY": { entry: "163.00", tp: "167.00", sl: "160.50" },
  "GBP/JPY": { entry: "190.50", tp: "196.00", sl: "187.50" },
}
const PIPS: Record<Pair, number> = { "EUR/USD": 248, "GBP/USD": 258, "USD/JPY": 246, "USD/CHF": 60, "EUR/JPY": 350, "GBP/JPY": 502 }
const RR: Record<Pair, string> = { "EUR/USD": "2.1:1", "GBP/USD": "1.9:1", "USD/JPY": "2.6:1", "USD/CHF": "1.2:1", "EUR/JPY": "2.0:1", "GBP/JPY": "2.4:1" }
const TIMEFRAME: Record<Pair, string> = { "EUR/USD": "4–12 hrs", "GBP/USD": "1–3 days", "USD/JPY": "1–5 days", "USD/CHF": "Watch only", "EUR/JPY": "1–3 days", "GBP/JPY": "2–7 days" }
const VOLATILITY: Record<Pair, "LOW" | "MEDIUM" | "HIGH"> = { "EUR/USD": "MEDIUM", "GBP/USD": "HIGH", "USD/JPY": "HIGH", "USD/CHF": "LOW", "EUR/JPY": "HIGH", "GBP/JPY": "HIGH" }
const HISTORY: Record<Pair, number[]> = {
  "EUR/USD": [1.071,1.075,1.073,1.078,1.076,1.080,1.079,1.082,1.081,1.083,1.082,1.085,1.084,1.0842],
  "GBP/USD": [1.282,1.278,1.275,1.271,1.274,1.268,1.265,1.263,1.268,1.264,1.261,1.263,1.260,1.2618],
  "USD/JPY": [148.2,148.9,149.4,150.1,149.8,150.5,150.9,151.0,150.7,151.1,151.2,151.0,151.3,151.34],
  "USD/CHF": [0.898,0.901,0.899,0.903,0.901,0.902,0.900,0.903,0.901,0.902,0.902,0.901,0.903,0.9021],
  "EUR/JPY": [158.2,159.1,160.4,161.2,160.8,161.5,162.0,162.8,162.3,163.0,163.1,163.0,163.2,163.21],
  "GBP/JPY": [186.1,187.4,188.0,188.9,188.5,189.2,189.8,190.1,189.7,190.3,190.5,190.7,190.9,190.98],
}
const RADAR_BASE: Record<Pair, Record<string, number>> = {
  "EUR/USD": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
  "GBP/USD": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
  "USD/JPY": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
  "USD/CHF": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
  "EUR/JPY": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
  "GBP/JPY": { Technical: 50, Macro: 50, Sentiment: 50, Momentum: 50, Risk: 50 },
}

// ─── Reasoning built dynamically from live data ───────────────────────────────
type ReasonData = {
  headline: string; summary: string
  factors: { label: string; detail: string; agent: string; strength: number }[]
  risks: { label: string; detail: string; severity: "HIGH" | "MEDIUM" | "LOW" }[]
  macro: { rate_base: string; rate_quote: string; differential: string; gdp_base: string; gdp_quote: string; inflation_base: string; inflation_quote: string }
  technical: { trend: string; support: string; resistance: string; rsi: number; pattern: string; volume: string }
  agents: string[]
}

// Build reasoning from live API data, falling back to generic content
function buildReasoning(pair: Pair, liveAgents: LivePairData["agents"], signal: "BUY" | "SELL" | "HOLD", explanation: string | null): ReasonData {
  const [base, quote] = pair.split("/")
  const factors: ReasonData["factors"] = []
  const risks: ReasonData["risks"] = []
  const agentNames: string[] = []

  // Sentiment agent
  const sent = liveAgents.sentiment
  if (sent?.available) {
    agentNames.push("Sentiment")
    const sentSig = sent.signal?.toUpperCase()
    const strength = Math.round((sent.confidence ?? 0.5) * 100)
    const topModel = sent.model_votes
      ? Object.entries(sent.model_votes).reduce((best, [m, v]) => {
          const top = Object.entries(v as Record<string, number>).reduce((a, b) => a[1] > b[1] ? a : b)
          return top[1] > (best.score ?? 0) ? { model: m, sig: top[0], score: top[1] } : best
        }, { model: "", sig: "", score: 0 })
      : null
    factors.push({
      label: `Sentiment Ensemble: ${sentSig}`,
      detail: `5-model stacking ensemble (LR, LightGBM, TextCNN, BiLSTM, DistilBERT) signals ${sentSig} based on ${sent.articles_used ?? 0} news articles. ${topModel ? `Top model: ${topModel.model.toUpperCase()} at ${(topModel.score * 100).toFixed(0)}%.` : ""}`,
      agent: "Sentiment",
      strength,
    })
  }

  // Correlation agent
  const corr = liveAgents.correlation
  if (corr?.available) {
    agentNames.push("Correlation")
    const strength = Math.round((corr.confidence ?? 0.32) * 100)
    factors.push({
      label: `Correlation & Regime: ${corr.signal?.toUpperCase()}`,
      detail: `XGBoost + Markov regime analysis. Sharpe ratio: ${corr.sharpe?.toFixed(3) ?? "N/A"}. Regime score: ${((corr.regime ?? 0) * 100).toFixed(1)}%. Probability of upward move: ${((corr.last_proba_up ?? 0.5) * 100).toFixed(1)}%.`,
      agent: "Correlation",
      strength,
    })
  }

  // Geopolitical agent
  const geo = liveAgents.geopolitical
  if (geo?.available) {
    agentNames.push("Geopolitical")
    const strength = Math.round((geo.confidence ?? 0.33) * 100)
    factors.push({
      label: `Geopolitical Risk: ${geo.signal?.toUpperCase()}`,
      detail: `MLP + Gradient Boosting + Random Forest ensemble on GDELT geopolitical features. Model agreement: ${geo.agreement ?? "N/A"}. Signal strength: ${geo.strength ?? "N/A"}.`,
      agent: "Geopolitical",
      strength,
    })
    if (geo.agreement === "low" || geo.strength === "weak") {
      risks.push({ label: "Geopolitical model disagreement", detail: "Models disagree on geopolitical risk direction. Reduce position size in uncertain geopolitical environments.", severity: "MEDIUM" })
    }
  }

  // Technical agent
  const tech = liveAgents.technical
  if (tech?.available) {
    agentNames.push("Technical")
    const strength = Math.round((tech.confidence ?? 0.33) * 100)
    const tfSummary = tech.tf_votes
      ? Object.entries(tech.tf_votes).map(([tf, v]) => {
          const best = Object.entries(v as Record<string, number>).reduce((a, b) => a[1] > b[1] ? a : b)
          return `${tf}:${best[0].toUpperCase()}`
        }).join(", ")
      : "N/A"
    factors.push({
      label: `Technical Multi-Timeframe: ${tech.signal?.toUpperCase()}`,
      detail: `RF + HGB + LR ensemble across multiple timeframes. Timeframe votes: ${tfSummary}. Confidence: ${(strength)}%.`,
      agent: "Technical",
      strength,
    })
  }

  // Macro agent
  const macro = liveAgents.macro
  if (macro?.available) {
    agentNames.push("Macro")
    const strength = Math.round((macro.confidence ?? 0.33) * 100)
    const driversText = macro.drivers?.slice(0, 2).join(". ") ?? "LLM macro analysis performed."
    factors.push({
      label: `Macro Analysis: ${macro.signal?.toUpperCase()}`,
      detail: `LLM-powered macro scoring. ${driversText} Base score: ${((macro.pair_score ?? 0) * 100).toFixed(0)}%.`,
      agent: "Macro",
      strength,
    })
  }

  // Default risks if none from agents
  if (risks.length === 0) {
    risks.push(
      { label: "Low model confidence", detail: "Multiple agents are reporting below-threshold confidence. Consider waiting for a clearer signal before entering.", severity: signal === "HOLD" ? "MEDIUM" : "LOW" },
      { label: "Missing agent data", detail: "Some prediction agents (geopolitical, technical, macro) are currently unavailable. Signal is based on partial information.", severity: "MEDIUM" },
    )
  }

  // If no factors at all, add a generic one
  if (factors.length === 0) {
    factors.push({
      label: `Rule-Based Decision: ${signal}`,
      detail: "Signal generated by weighted rule-based fallback combining available agent outputs.",
      agent: "System",
      strength: 45,
    })
    agentNames.push("System")
  }

  // Macro table: static per-pair fundamentals (real rates)
  const MACRO_STATIC: Record<Pair, ReasonData["macro"]> = {
    "EUR/USD": { rate_base: "4.50% (ECB)", rate_quote: "5.25–5.50% (Fed)", differential: "-0.75%", gdp_base: "+0.3% QoQ", gdp_quote: "+3.3% QoQ", inflation_base: "2.8% CPI", inflation_quote: "3.4% CPI" },
    "GBP/USD": { rate_base: "5.25% (BoE)", rate_quote: "5.25–5.50% (Fed)", differential: "0.00%", gdp_base: "+0.1% QoQ", gdp_quote: "+3.3% QoQ", inflation_base: "3.4% CPI", inflation_quote: "3.4% CPI" },
    "USD/JPY": { rate_base: "5.25–5.50% (Fed)", rate_quote: "-0.10% (BoJ)", differential: "+5.35%", gdp_base: "+3.3% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "3.4% CPI", inflation_quote: "2.8% CPI" },
    "USD/CHF": { rate_base: "5.25–5.50% (Fed)", rate_quote: "1.75% (SNB)", differential: "+3.50%", gdp_base: "+3.3% QoQ", gdp_quote: "+0.3% QoQ", inflation_base: "3.4% CPI", inflation_quote: "1.2% CPI" },
    "EUR/JPY": { rate_base: "4.50% (ECB)", rate_quote: "-0.10% (BoJ)", differential: "+4.60%", gdp_base: "+0.3% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "2.8% CPI", inflation_quote: "2.8% CPI" },
    "GBP/JPY": { rate_base: "5.25% (BoE)", rate_quote: "-0.10% (BoJ)", differential: "+5.35%", gdp_base: "+0.1% QoQ", gdp_quote: "+0.1% QoQ", inflation_base: "3.4% CPI", inflation_quote: "2.8% CPI" },
  }
  const TECH_STATIC: Record<Pair, ReasonData["technical"]> = {
    "EUR/USD": { trend: signal === "BUY" ? "Bullish" : signal === "SELL" ? "Bearish" : "Sideways", support: "1.0720", resistance: "1.0950", rsi: 52, pattern: "Awaiting signal", volume: "Average" },
    "GBP/USD": { trend: signal === "BUY" ? "Bullish" : signal === "SELL" ? "Bearish" : "Sideways", support: "1.2450", resistance: "1.2750", rsi: 50, pattern: "Awaiting signal", volume: "Average" },
    "USD/JPY": { trend: signal === "BUY" ? "Strongly Bullish" : signal === "SELL" ? "Bearish" : "Sideways", support: "149.50", resistance: "153.00", rsi: 55, pattern: "Awaiting signal", volume: "Average" },
    "USD/CHF": { trend: "Sideways/Range", support: "0.8940", resistance: "0.9080", rsi: 50, pattern: "Range Consolidation", volume: "Below Average" },
    "EUR/JPY": { trend: signal === "BUY" ? "Bullish" : signal === "SELL" ? "Bearish" : "Sideways", support: "160.50", resistance: "167.00", rsi: 53, pattern: "Awaiting signal", volume: "Average" },
    "GBP/JPY": { trend: signal === "BUY" ? "Strongly Bullish" : signal === "SELL" ? "Bearish" : "Sideways", support: "187.50", resistance: "196.00", rsi: 56, pattern: "Awaiting signal", volume: "Average" },
  }

  const headline = explanation
    ? explanation.slice(0, 80) + (explanation.length > 80 ? "…" : "")
    : signal === "HOLD"
    ? `${pair} — No Clear Directional Edge (Low Confidence)`
    : signal === "BUY"
    ? `${pair} — AI Models Signal Upside Opportunity`
    : `${pair} — AI Models Signal Downside Pressure`

  const summary = explanation
    ? explanation.slice(0, 280)
    : `ARIA's AI ensemble (${agentNames.join(", ")}) generated a ${signal} signal. ${
        signal === "HOLD" ? "Confidence is below threshold — no actionable edge identified at this time. Monitor for improving signal quality." : `Confidence: ${factors[0]?.strength ?? 45}%.`
      }`

  return {
    headline,
    summary,
    factors,
    risks,
    macro: MACRO_STATIC[pair],
    technical: TECH_STATIC[pair],
    agents: agentNames.length > 0 ? agentNames : ["System"],
  }
}

// ─── Scenario type ────────────────────────────────────────────────────────────
type PairEffect = { direction: -1 | 0 | 1; magnitude: number }
type Scenario = {
  id: string; name: string; emoji: string; probability: number
  shockType: "bullish" | "bearish" | "neutral"; shockMagnitude: number
  description: string; macroContext: string; triggerEvent: string
  pairEffects: Record<string, PairEffect>
}

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
      "EUR/JPY": { direction:  0, magnitude: 0.20 }, "GBP/JPY": { direction:  1, magnitude: 0.60 },
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
      "EUR/JPY": { direction: -1, magnitude: 0.88 }, "GBP/JPY": { direction: -1, magnitude: 0.96 },
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
      "EUR/JPY": { direction:  0, magnitude: 0.15 }, "GBP/JPY": { direction:  1, magnitude: 0.45 },
    },
  },
]

// ─── Real API response shape ──────────────────────────────────────────────────
type RealApiSingleResponse = {
  success: boolean
  data: {
    pair: string           // e.g. "EURUSD"
    timestamp: string
    final_signal: string   // "buy" | "sell" | "hold"
    final_confidence: number
    confidence_gated: boolean
    final_probs: { buy: number; hold: number; sell: number }
    decision_method: string
    decision_reason: string
    explanation: string
    agents: {
      sentiment: {
        signal: string; confidence: number
        probs: { buy: number; hold: number; sell: number }
        model_votes: Record<string, Record<string, number>>
        articles_used: number
        ensemble_info?: Record<string, string>
        available?: boolean
      }
      correlation: {
        signal: string; confidence: number
        probs: { buy: number; hold: number; sell: number }
        sharpe: number; last_proba_up: number
        last_regime: number; score: number; available: boolean
      }
      geopolitical: {
        signal: string; confidence: number
        probs: { buy: number; hold: number; sell: number }
        model_votes: Record<string, Record<string, number>>
        agreement: string; strength: string; available: boolean
      }
      technical: {
        signal: string; confidence: number
        probs: { buy: number; hold: number; sell: number }
        tf_votes: Record<string, Record<string, number>>
        available: boolean
      }
      macro: {
        signal: string; confidence: number
        probs: { buy: number; hold: number; sell: number }
        pair_score: number; base_score: number; quote_score: number
        summary: string; drivers: string[]; available: boolean
      }
    }
  }
  error?: string
}

// ─── Live pair data shape (internal) ─────────────────────────────────────────
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
    sentiment?:    RealApiSingleResponse["data"]["agents"]["sentiment"] & { available?: boolean }
    correlation?:  RealApiSingleResponse["data"]["agents"]["correlation"]
    geopolitical?: RealApiSingleResponse["data"]["agents"]["geopolitical"]
    technical?:    RealApiSingleResponse["data"]["agents"]["technical"]
    macro?:        RealApiSingleResponse["data"]["agents"]["macro"]
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function mapSignal(s: string): "BUY" | "SELL" | "HOLD" {
  const u = s.toUpperCase()
  if (u === "BUY")  return "BUY"
  if (u === "SELL") return "SELL"
  return "HOLD"
}

function deriveGrowth(signal: "BUY" | "SELL" | "HOLD", confidence: number): number {
  if (signal === "HOLD") return parseFloat((confidence * 0.5).toFixed(2))
  const dir   = signal === "BUY" ? 1 : -1
  const scale = 0.3 + confidence * 4.0
  return parseFloat((dir * scale).toFixed(2))
}

function liveRadar(pair: Pair, liveAgents: LivePairData["agents"]): Record<string, number> {
  const base = { ...RADAR_BASE[pair] }
  // Sentiment
  if (liveAgents.sentiment?.available !== false) {
    base.Sentiment = Math.round((liveAgents.sentiment?.confidence ?? 0.5) * 100)
  }
  // Correlation
  if (liveAgents.correlation?.available) {
    base.Momentum = Math.round((liveAgents.correlation.confidence ?? 0.32) * 100)
  }
  // Technical
  if (liveAgents.technical?.available) {
    base.Technical = Math.round((liveAgents.technical.confidence ?? 0.33) * 100)
  }
  // Macro
  if (liveAgents.macro?.available) {
    base.Macro = Math.round((liveAgents.macro.confidence ?? 0.33) * 100)
  }
  // Geopolitical → Risk (inverse: high geo risk = lower risk score)
  if (liveAgents.geopolitical?.available) {
    const geoConf = liveAgents.geopolitical.confidence ?? 0.33
    base.Risk = Math.round((1 - geoConf) * 100)
  }
  return base
}

function computeOutcome(
  pair: string, signal: "BUY" | "SELL" | "HOLD",
  baseGrowth: number, scenario: Scenario, capital: number,
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
  return { adjustedGrowth, capitalOutcome: capital * (1 + adjustedGrowth / 100), gainLoss: capital * (adjustedGrowth / 100), confidence, survival, decision }
}

function sc(s: "BUY" | "SELL" | "HOLD") {
  return {
    BUY:  { hex: "#10b981", bar: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10", dot: "bg-emerald-400", glow: "0 0 60px rgba(16,185,129,0.12)" },
    SELL: { hex: "#f43f5e", bar: "bg-rose-500",    text: "text-rose-400",    border: "border-rose-500/40",    bg: "bg-rose-500/10",    dot: "bg-rose-400",    glow: "0 0 60px rgba(244,63,94,0.12)" },
    HOLD: { hex: "#f59e0b", bar: "bg-amber-500",   text: "text-amber-400",   border: "border-amber-500/40",   bg: "bg-amber-500/10",   dot: "bg-amber-400",   glow: "0 0 60px rgba(245,158,11,0.12)" },
  }[s]
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE DATA HOOK — calls real Azure API directly
// ════════════════════════════════════════════════════════════════════════════
function useLiveData(pairs: Pair[]) {
  const [data, setData] = useState<Record<string, LivePairData>>(() => {
    const init: Record<string, LivePairData> = {}
    PAIRS.forEach(p => {
      init[p] = {
        signal: SIGNAL_STATIC[p], conviction: CONVICTION_STATIC[p], growth: GROWTH_STATIC[p],
        loading: false, error: null, lastUpdated: null, articles: 0,
        probs: null, method: null, reason: null, explanation: null, gated: false, agents: {},
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
      const apiPair = PAIR_TO_API[pair]
      // Call real API directly — CORS must be open, or proxy via Next.js /api/predict
      // If you have a proxy, replace the URL with: `/api/predict?pair=${apiPair}`
      const res = await fetch(`${REAL_API_BASE}/predict?pair=${apiPair}`, {
        signal: ctrl.signal,
        headers: { "Accept": "application/json" },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: RealApiSingleResponse = await res.json()
      if (!json.success) throw new Error(json.error ?? "API returned success=false")

      const d = json.data
      const signal     = mapSignal(d.final_signal)
      const confidence = d.final_confidence    // already 0–1
      const conviction = Math.round(confidence * 100)
      const growth     = deriveGrowth(signal, confidence)

      // Sentiment has articles_used, not articles — map it
      const sent = d.agents.sentiment
      const sentNorm = sent ? { ...sent, available: true, articles: sent.articles_used ?? 0 } : undefined

      setData(prev => ({
        ...prev,
        [pair]: {
          signal, conviction, growth,
          loading:     false,
          error:       null,
          lastUpdated: new Date(d.timestamp),
          articles:    sent?.articles_used ?? 0,
          probs:       d.final_probs,
          method:      d.decision_method ?? null,
          reason:      d.decision_reason ?? null,
          explanation: d.explanation || null,
          gated:       d.confidence_gated ?? false,
          agents: {
            sentiment:    sentNorm,
            correlation:  d.agents.correlation,
            geopolitical: d.agents.geopolitical,
            technical:    d.agents.technical,
            macro:        d.agents.macro,
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

  // Batch fetch: tries predict_all first, then falls back to per-pair
  const fetchAll = useCallback(async (pairsToFetch: Pair[]) => {
    pairsToFetch.forEach(p => setData(prev => ({ ...prev, [p]: { ...prev[p], loading: true, error: null } })))
    try {
      const res = await fetch(`${REAL_API_BASE}/predict_all`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: { success: boolean; data: Record<string, { signal: string; confidence: number; gated: boolean; probs: { buy: number; hold: number; sell: number }; method: string }> } = await res.json()
      if (!json.success) throw new Error("predict_all returned success=false")

      // Apply batch results — then fetch full details per-pair for agent breakdown
      Object.entries(json.data).forEach(([apiKey, val]) => {
        const pair = API_TO_PAIR[apiKey]
        if (!pair || !pairsToFetch.includes(pair)) return
        const signal     = mapSignal(val.signal)
        const confidence = val.confidence
        const conviction = Math.round(confidence * 100)
        const growth     = deriveGrowth(signal, confidence)
        setData(prev => ({
          ...prev,
          [pair]: {
            ...prev[pair],
            signal, conviction, growth,
            loading:     true,   // still loading full details
            probs:       val.probs,
            method:      val.method,
            gated:       val.gated,
            lastUpdated: new Date(),
          },
        }))
      })

      // Now fetch full details for each pair to get agent breakdown
      await Promise.allSettled(pairsToFetch.map(p => fetchPair(p)))
    } catch {
      // Batch failed — fall back to individual fetches
      await Promise.allSettled(pairsToFetch.map(p => fetchPair(p)))
    }
  }, [fetchPair])

  useEffect(() => {
    fetchAll(pairs)
    return () => { Object.values(abortRefs.current).forEach(c => c.abort()) }
  }, [pairs.join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch    = useCallback((pair: Pair) => fetchPair(pair), [fetchPair])
  const refetchAll = useCallback(() => fetchAll(pairs), [pairs, fetchAll])

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
      <button onClick={onRefetch} title={`Error: ${pairData.error}. Click to retry.`}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold text-rose-400 hover:bg-rose-500/20 transition-colors">
        <WifiOff className="h-2.5 w-2.5" />RETRY
      </button>
    )
  }
  if (pairData.lastUpdated) {
    const mins = Math.floor((Date.now() - pairData.lastUpdated.getTime()) / 60000)
    return (
      <button onClick={onRefetch} title="Refresh live data"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors">
        <Wifi className="h-2.5 w-2.5" />
        LIVE {mins > 0 ? `· ${mins}m ago` : "· just now"}
        {pairData.articles > 0 && ` · ${pairData.articles} art.`}
      </button>
    )
  }
  return null
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT SIGNALS PANEL — reads real agent data
// ════════════════════════════════════════════════════════════════════════════
function AgentSignalsPanel({ agents }: { agents: LivePairData["agents"] }) {
  const agentEntries: Array<{ name: string; data: { signal: string; confidence: number; probs?: { buy: number; hold: number; sell: number }; available?: boolean } }> = []

  if (agents.sentiment) agentEntries.push({ name: "Sentiment (5-model ensemble)", data: { ...agents.sentiment, available: true } })
  if (agents.correlation?.available) agentEntries.push({ name: "Correlation & Regime", data: agents.correlation })
  if (agents.geopolitical?.available) agentEntries.push({ name: "Geopolitical (GDELT)", data: agents.geopolitical })
  if (agents.technical?.available) agentEntries.push({ name: "Technical (Multi-TF)", data: agents.technical })
  if (agents.macro?.available) agentEntries.push({ name: "Macro (LLM)", data: agents.macro })

  if (agentEntries.length === 0) return null

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 space-y-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-3">
        Agent Consensus ({agentEntries.length} active)
      </p>
      {agentEntries.map(({ name, data }) => {
        const signal = mapSignal(data.signal ?? "hold")
        const conf   = data.confidence ?? 0.33
        const c = sc(signal)
        return (
          <div key={name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">{name}</span>
              <SignalPill s={signal} size="sm" />
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-slate-500">Confidence</span>
              <span className="text-[10px] font-black text-slate-400">{(conf * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${conf * 100}%` }} />
            </div>
            {data.probs && (
              <div className="grid grid-cols-3 gap-1 mt-2">
                {(["buy","hold","sell"] as const).map(k => (
                  <div key={k} className="text-center">
                    <p className={`text-[9px] ${k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"}`}>{k.toUpperCase()}</p>
                    <p className="text-[9px] text-slate-500">{((data.probs![k] ?? 0) * 100).toFixed(0)}%</p>
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

function PortfolioCards({ portfolios, active, onSelect, liveData }: { portfolios: IPortfolio[]; active: number; onSelect: (i: number) => void; liveData: Record<string, LivePairData> }) {
  const riskColor  = { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" }
  const riskBorder = { low: "border-emerald-500/25", medium: "border-amber-500/25", high: "border-rose-500/25" }
  const riskBg     = { low: "bg-emerald-500/[0.06]", medium: "bg-amber-500/[0.06]", high: "bg-rose-500/[0.06]" }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {portfolios.map((p, i) => {
        const isActive   = i === active
        const validPairs = p.currencyPairs.filter(x => PAIRS.includes(x as Pair)) as Pair[]
        const netGrowth  = validPairs.length > 0
          ? validPairs.reduce((s, pair) => s + (liveData[pair]?.growth ?? GROWTH_STATIC[pair]), 0) / validPairs.length
          : 0
        const isPos = netGrowth >= 0
        return (
          <button key={i} onClick={() => onSelect(i)}
            className={`shrink-0 min-w-[200px] text-left rounded-2xl border p-5 transition-all duration-200 ${isActive ? "border-blue-500/50 bg-blue-500/[0.07] shadow-lg shadow-blue-500/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <Wallet className="h-4 w-4 text-slate-400" />
              </div>
              {isActive && <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black text-blue-400 tracking-widest">ACTIVE</span>}
            </div>
            <p className="text-sm font-black text-white mb-1.5 leading-snug">{p.name}</p>
            <div className="flex items-center gap-1.5 mb-4">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${riskColor[p.riskLevel]} ${riskBorder[p.riskLevel]} ${riskBg[p.riskLevel]}`}>{p.riskLevel.toUpperCase()} RISK</span>
              <span className="text-[9px] text-slate-600">{p.tradingStyle}</span>
            </div>
            <div className="flex items-end justify-between pt-3 border-t border-white/[0.05]">
              <div>
                <p className="text-[9px] text-slate-600 mb-0.5">Balance</p>
                <p className="text-base font-black text-white">${fmt(p.initialCapital)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-600 mb-0.5">Expected</p>
                <p className={`text-sm font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}>{isPos ? "+" : ""}{netGrowth.toFixed(1)}%</p>
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
function PairSelector({ pairs, active, onChange, perPair, liveData, onRefetch }: {
  pairs: Pair[]; active: Pair; onChange: (p: Pair) => void; perPair: number
  liveData: Record<string, LivePairData>; onRefetch: (p: Pair) => void
}) {
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
            <button key={p} onClick={() => onChange(p)}
              className={`group relative text-left rounded-2xl border transition-all duration-200 overflow-hidden ${isActive ? `${c.border} shadow-lg` : "border-white/[0.07] hover:border-white/[0.15]"}`}
              style={isActive ? { background: `linear-gradient(135deg, ${c.hex}14 0%, #070d1c 100%)`, boxShadow: c.glow } : { background: "rgba(255,255,255,0.02)" }}>
              {isActive && <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />}
              <div className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${isActive ? `${c.bg} ${c.text} border ${c.border}` : "bg-white/[0.05] text-slate-600"}`}>{idx + 1}</div>
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
                    <p className={`text-[10px] font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(4)}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">Conviction</span>
                    <span className={`text-[10px] font-black ${isActive ? c.text : "text-slate-400"}`}>{conv}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${conv}%`, opacity: isActive ? 1 : 0.45 }} />
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
                      <p className={`text-[10px] font-black ${"colored" in stat && stat.colored ? (stat.pos ? "text-emerald-400" : "text-rose-400") : "text-white"}`}>{stat.value}</p>
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
                className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${p === active ? `${c.border} ${c.bg}` : "border-white/[0.06] hover:border-white/[0.14]"}`}>
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
function OverviewTab({ pair, capital, portfolioPairs, liveData, onRefetch }: {
  pair: Pair; capital: number; portfolioPairs: Pair[]
  liveData: Record<string, LivePairData>; onRefetch: (p: Pair) => void
}) {
  const pd    = liveData[pair]
  const sig   = pd.signal
  const c     = sc(sig)
  const g     = pd.growth
  const conv  = pd.conviction
  const price = PRICE[pair], change = CHANGE[pair], t = TARGET[pair]
  const r     = buildReasoning(pair, pd.agents, sig, pd.explanation)
  const histData  = HISTORY[pair].map((v, i) => ({ i, v }))
  const projected = capital * (1 + g / 100)
  const gain      = projected - capital
  const allData   = portfolioPairs.map(p => ({ pair: p, g: liveData[p]?.growth ?? GROWTH_STATIC[p], fill: sc(liveData[p]?.signal ?? SIGNAL_STATIC[p]).hex }))
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
                      {pd.method === "meta_model" ? "META-MODEL" : pd.method.toUpperCase()}
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
              <p className={`text-xs font-mono mt-0.5 ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(4)}</p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Conviction</p>
              <p className={`text-xs font-black ${c.text}`}>{conv}% — {conv >= 75 ? "High alignment" : conv >= 60 ? "Moderate signal" : conv >= 45 ? "Cautious" : "Below threshold"}</p>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${conv}%` }} />
            </div>
          </div>

          {/* Real-time decision reason from API */}
          {pd.reason && (
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Model Decision Reason</p>
              <p className="text-xs text-slate-400">{pd.reason}</p>
            </div>
          )}

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
          { icon: Clock,    label: "Timeframe",   value: TIMEFRAME[pair], color: "text-white" },
          { icon: Target,   label: "Pip Target",  value: `~${PIPS[pair]}`, color: "text-white" },
          { icon: BarChart2, label: "Risk/Reward", value: RR[pair],       color: "text-white" },
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
              { label: "Allocated",  value: `$${fmt(capital)}`,            sub: "Your split",                              color: "text-white" },
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
                  ? ` Signal from real AI prediction at ${pd.lastUpdated.toLocaleTimeString()}. Conviction ${conv}%.`
                  : ` Conviction-derived estimate (${conv}%).`}
                {" "}Risk/Reward {RR[pair]}: for every $1 risked, ${RR[pair].split(":")[0]} is targeted.
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
// TAB — TECHNICAL (reads live technical agent)
// ════════════════════════════════════════════════════════════════════════════
function TechnicalTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd   = liveData[pair]
  const sig  = pd.signal
  const c    = sc(sig)
  const r    = buildReasoning(pair, pd.agents, sig, pd.explanation)
  const tech = r.technical
  const t    = TARGET[pair]
  const hist = HISTORY[pair]
  const radarData = Object.entries(liveRadar(pair, pd.agents)).map(([k, v]) => ({ subject: k, value: v, fullMark: 100 }))
  const priceData = hist.map((v, i) => ({ i, v, sma: i >= 4 ? hist.slice(i - 4, i + 1).reduce((a, b) => a + b) / 5 : v }))
  const yMin = Math.min(parseFloat(t.sl), hist[0]) * 0.9993
  const yMax = Math.max(parseFloat(t.tp), hist[hist.length - 1]) * 1.0007

  // Live technical tf_votes
  const tfVotes = pd.agents.technical?.tf_votes

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
            <ReferenceLine y={parseFloat(t.tp)}    stroke="#10b981" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `TP ${t.tp}`,   fill: "#10b981", fontSize: 9, position: "insideRight" }} />
            <ReferenceLine y={parseFloat(t.sl)}    stroke="#f43f5e" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `SL ${t.sl}`,   fill: "#f43f5e", fontSize: 9, position: "insideRight" }} />
            <ReferenceLine y={parseFloat(t.entry)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1}   label={{ value: "Entry",        fill: "#f59e0b", fontSize: 9, position: "insideRight" }} />
            <Area type="monotone" dataKey="v"   stroke={c.hex}  strokeWidth={2.5} fill="url(#pcg)" dot={false} />
            <Line type="monotone" dataKey="sma" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Key Levels</p>
        </div>
        <div className="space-y-3">
          {[
            { label: "Resistance", value: tech.resistance, pct: 85, color: "text-rose-400",    bar: "bg-rose-500",    desc: "Overhead supply — sellers dominate here." },
            { label: "Current Price", value: PRICE[pair], pct: 50, color: c.text,              bar: c.bar,            desc: "Live market price." },
            { label: "Support",    value: tech.support,    pct: 15, color: "text-emerald-400", bar: "bg-emerald-500", desc: "Demand zone — buyers step in here." },
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
              { label: "Trend",    value: tech.trend,    color: c.text },
              { label: "RSI (14)", value: String(tech.rsi), color: tech.rsi > 70 ? "text-rose-400" : tech.rsi < 30 ? "text-emerald-400" : "text-white", note: tech.rsi > 70 ? "Overbought" : tech.rsi < 30 ? "Oversold" : "Neutral" },
              { label: "Pattern",  value: tech.pattern,  color: c.text },
              { label: "Volume",   value: tech.volume,   color: "text-white" },
              ...(pd.agents.correlation?.available ? [{ label: "Sharpe Ratio", value: pd.agents.correlation.sharpe?.toFixed(3) ?? "N/A", color: (pd.agents.correlation.sharpe ?? 0) > 0 ? "text-emerald-400" : "text-rose-400" }] : []),
              ...(pd.agents.correlation?.available ? [{ label: "Regime Score", value: `${((pd.agents.correlation.last_regime ?? 0) * 100).toFixed(1)}%`, color: "text-blue-400" }] : []),
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

      {/* Live timeframe votes from technical agent */}
      {tfVotes && Object.keys(tfVotes).length > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Live Timeframe Votes</p>
            <span className="ml-auto text-[9px] text-emerald-400">from technical agent</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(tfVotes).map(([tf, votes]) => {
              const best = Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)
              const bestSig = mapSignal(best[0])
              const bc = sc(bestSig)
              return (
                <div key={tf} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <span className="text-xs font-black text-slate-400 w-8 shrink-0">{tf}</span>
                  <SignalPill s={bestSig} size="sm" />
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    {(["buy","hold","sell"] as const).map(k => (
                      <div key={k} className="text-center">
                        <p className="text-[8px] text-slate-600">{k.toUpperCase()}</p>
                        <p className={`text-[10px] font-black ${k === "buy" ? "text-emerald-400" : k === "hold" ? "text-amber-400" : "text-rose-400"}`}>{((votes[k] ?? 0) * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — REASONING (fully live)
// ════════════════════════════════════════════════════════════════════════════
function ReasoningTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd  = liveData[pair]
  const sig = pd.signal
  const r   = buildReasoning(pair, pd.agents, sig, pd.explanation)
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

        {/* Raw model data */}
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 mb-4 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Raw Model Output</p>
          <div className="grid grid-cols-3 gap-2">
            {pd.probs && (["buy","hold","sell"] as const).map(k => (
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

        {/* LLM explanation if available */}
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
            <p className="text-sm font-black text-white">Sentiment Sub-Model Votes</p>
            <span className="ml-auto text-[9px] text-emerald-400">{pd.agents.sentiment.articles_used ?? 0} articles</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(pd.agents.sentiment.model_votes).map(([modelName, votes]) => {
              const best = Object.entries(votes).reduce((a, b) => a[1] > b[1] ? a : b)
              const bestSig = mapSignal(best[0])
              const bc = sc(bestSig)
              const LABELS: Record<string, string> = { lr: "Logistic Regression", lgb: "LightGBM", textcnn: "TextCNN", bilstm: "BiLSTM + Attention", transformer: "DistilBERT Transformer" }
              return (
                <div key={modelName} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-300">{LABELS[modelName] ?? modelName}</span>
                    <SignalPill s={bestSig} size="sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["buy","hold","sell"] as const).map(k => (
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
              )
            })}
          </div>
        </div>
      )}

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
                    <div className="border-t border-white/[0.07] pt-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{f.detail}</p>
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
                    <div className="border-t border-white/[0.07] pt-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{risk.detail}</p>
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
function useDynamicScenarios(pair: Pair, signal: "BUY" | "SELL" | "HOLD", conviction: number, growth: number) {
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [lastPair,  setLastPair]  = useState<string | null>(null)

  const fetchScenarios = useCallback(async (force = false) => {
    if (!force && lastPair === pair && generated) return
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, signal, conviction, growth, price: PRICE[pair] }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.scenarios?.length >= 1) { setScenarios(data.scenarios); setGenerated(true); setLastPair(pair) }
      else throw new Error("No scenarios returned")
    } catch (err: any) {
      setError(err.message); setScenarios(FALLBACK_SCENARIOS)
    } finally { setLoading(false) }
  }, [pair, signal, conviction, growth, lastPair, generated])

  useEffect(() => { fetchScenarios() }, [pair]) // eslint-disable-line react-hooks/exhaustive-deps
  return { scenarios, loading, error, generated, refetch: () => fetchScenarios(true) }
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — SCENARIOS
// ════════════════════════════════════════════════════════════════════════════
function ScenariosTab({ pair, capital, portfolioPairs, liveData }: {
  pair: Pair; capital: number; portfolioPairs: Pair[]; liveData: Record<string, LivePairData>
}) {
  const pd   = liveData[pair]
  const sig  = pd?.signal ?? "HOLD"
  const g    = pd?.growth ?? 0
  const conv = pd?.conviction ?? 50

  const { scenarios, loading, error, generated, refetch } = useDynamicScenarios(pair, sig, conv, g)
  const [activeId,  setActiveId]  = useState<string>(scenarios[0]?.id ?? "")
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    if (scenarios.length > 0 && !scenarios.find(s => s.id === activeId)) {
      setActiveId(scenarios[0].id); setShowSteps(false)
    }
  }, [scenarios]) // eslint-disable-line react-hooks/exhaustive-deps

  const scenario = scenarios.find(s => s.id === activeId) ?? scenarios[0]
  const outcome  = useMemo(() => scenario ? computeOutcome(pair, sig, g, scenario, capital) : null,
    [pair, sig, g, activeId, capital, scenarios]) // eslint-disable-line react-hooks/exhaustive-deps

  const allOut = scenarios.map(s => ({
    name: s.name.split(" ")[0],
    conf: Math.round(computeOutcome(pair, sig, g, s, capital).confidence * 100),
    surv: Math.round(computeOutcome(pair, sig, g, s, capital).survival  * 100),
  }))

  if (!scenario || !outcome) return null

  return (
    <div className="space-y-5">
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
          </div>
          <button onClick={refetch} disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {loading ? "Generating…" : "Regenerate"}
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {loading ? `ARIA is analysing ${pair} macro environment…` : `Scenarios for ${pair} ${sig} at ${conv}% conviction (${pd.method ?? "rule_based"}).`}
        </p>
        {error && !loading && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <p className="text-[10px] text-rose-400">Scenario generation failed — showing static fallbacks.</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2.5">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-xl bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-white/[0.06]" />
                  <div className="h-3 w-full rounded bg-white/[0.04]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-2.5">
          {scenarios.map(s => {
            const active = s.id === activeId
            const o      = computeOutcome(pair, sig, g, s, capital)
            const bdr = s.shockType === "bullish" ? "border-emerald-500/35 bg-emerald-500/[0.04]" : s.shockType === "bearish" ? "border-rose-500/35 bg-rose-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"
            return (
              <div key={s.id}
                className={`rounded-3xl border transition-all overflow-hidden cursor-pointer ${active ? bdr : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                onClick={() => { setActiveId(s.id); setShowSteps(false) }}>
                <div className="flex items-start gap-4 p-5">
                  <span className="text-3xl mt-0.5 shrink-0">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-black text-white">{s.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${s.shockType === "bullish" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : s.shockType === "bearish" ? "border-rose-500/30 text-rose-400 bg-rose-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"}`}>{s.shockType.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-500">{s.probability}% prob.</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
                    {active && (
                      <>
                        <p className="text-[11px] text-slate-500 mt-2"><span className="text-slate-400 font-semibold">Trigger: </span>{s.triggerEvent}</p>
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

      {!loading && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
          <div className="p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Outcome — {scenario.name}</p>
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
                { label: "Trade Confidence", note: "≥70% = Proceed", value: Math.round(outcome.confidence * 100), color: outcome.confidence >= 0.7 ? "bg-emerald-500" : outcome.confidence >= 0.5 ? "bg-amber-500" : "bg-rose-500" },
                { label: "Survival",         note: "≥60% = Proceed", value: Math.round(outcome.survival  * 100), color: "bg-blue-500" },
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
                { l: "Current",        v: `$${fmt(capital)}`,                                                            col: "text-white" },
                { l: "Under Scenario", v: `$${fmt(outcome.capitalOutcome, 0)}`,                                          col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
                { l: "Net Change",     v: `${outcome.gainLoss >= 0 ? "+" : "−"}$${fmt(Math.abs(outcome.gainLoss), 0)}`,  col: outcome.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400" },
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
              <button onClick={() => setShowSteps(v => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-blue-400 transition-all">
                <Info className="h-3.5 w-3.5" />Decision logic
                <ChevronRight className={`h-3 w-3 transition-transform ${showSteps ? "rotate-90" : ""}`} />
              </button>
            </div>
            {showSteps && (
              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 mb-4">Step-by-Step Decision Logic</p>
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
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[9px] font-black text-blue-400">{i + 1}</span>
                      <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs font-black text-white mb-1">Confidence vs Survival — All Scenarios</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={allOut} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 8 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0b1526", border: "1px solid #ffffff12", borderRadius: 12, fontSize: 11 }} />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" />
              <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="4 4" />
              <Bar dataKey="conf" name="Confidence" fill="#10b981" opacity={0.75} radius={[3,3,0,0]} />
              <Bar dataKey="surv" name="Survival"   fill="#3b82f6" opacity={0.75} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB — MACRO (reads live macro agent)
// ════════════════════════════════════════════════════════════════════════════
function MacroTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd  = liveData[pair]
  const sig = pd.signal
  const r   = buildReasoning(pair, pd.agents, sig, pd.explanation)
  const c   = sc(sig)
  const [base, quote] = pair.split("/")

  const events = [
    { name: `${base === "EUR" ? "ECB" : base === "GBP" ? "Bank of England" : base === "USD" ? "Federal Reserve" : "Bank of Japan"} Rate Decision`, impact: "HIGH" as const, timing: "Next week", currency: base },
    { name: `${base} GDP Release`,                                                                              impact: "HIGH"   as const, timing: "2 weeks", currency: base },
    { name: `${quote === "USD" ? "US CPI Inflation" : quote + " Inflation Data"}`,                            impact: "HIGH"   as const, timing: "3 days",  currency: quote },
    { name: `${quote} Labour Market Report`,                                                                   impact: "MEDIUM" as const, timing: "4 days",  currency: quote },
    { name: `${base} Purchasing Managers Index`,                                                               impact: "MEDIUM" as const, timing: "5 days",  currency: base },
  ]

  return (
    <div className="space-y-5">
      {/* Live macro agent output */}
      {pd.agents.macro?.available && (
        <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-black text-white">Live Macro Agent</p>
            <SignalPill s={mapSignal(pd.agents.macro.signal)} size="sm" />
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
              { l: "Pair Score",  v: `${((pd.agents.macro.pair_score ?? 0) * 100).toFixed(0)}%` },
              { l: "Base Score",  v: `${((pd.agents.macro.base_score ?? 0) * 100).toFixed(0)}%` },
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

      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.07] bg-black/20">
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[base]} {base}</p></div>
          <div className="px-4 py-3 text-center border-x border-white/[0.07] min-w-[110px]"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Metric</p></div>
          <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{FLAGS[quote]} {quote}</p></div>
        </div>
        {[
          { metric: "Interest Rate", base: r.macro.rate_base,     quote: r.macro.rate_quote },
          { metric: "GDP Growth",    base: r.macro.gdp_base,       quote: r.macro.gdp_quote },
          { metric: "Inflation",     base: r.macro.inflation_base, quote: r.macro.inflation_quote },
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
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${ev.impact === "HIGH" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>{ev.impact}</span>
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
            All signals are fetched <span className="font-bold text-emerald-400">live</span> from your real AI models running on Azure. No static data — every signal, confidence score, and agent vote is from your actual prediction system.
          </p>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">⚡ Real Model Pipeline</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Signals come from your Central Brain v7: Sentiment (5-model stacking: LR, LightGBM, TextCNN, BiLSTM, DistilBERT), Correlation (XGBoost + Markov regime), Geopolitical (GDELT-based MLP/GB/RF), Technical (RF + HGB + LR multi-timeframe), and Macro (LLaMA-3.1-70B).
            </p>
          </div>
          {[
            { icon: LayoutDashboard, title: "Overview",   desc: "Live signal, conviction score from real model confidence, capital projection, and pair comparison all driven by your Azure API." },
            { icon: Activity,        title: "Technical",  desc: "Signal radar built from live agent confidences. Timeframe votes come directly from your technical agent's tf_votes output." },
            { icon: Brain,           title: "Reasoning",  desc: "Every sentiment sub-model vote (LR, LightGBM, TextCNN, BiLSTM, DistilBERT) shown live. LLaMA explanation displayed if available." },
            { icon: FlaskConical,    title: "Scenarios",  desc: "AI-generated what-if scenarios tailored to your live signal and conviction level." },
            { icon: Globe,           title: "Macro",      desc: "Live macro agent summary and drivers. Rate differential and economic context always shown." },
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
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">API Endpoint</p>
            <p className="text-xs text-slate-400 font-mono break-all">{REAL_API_BASE}/predict?pair=EURUSD</p>
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
// DEMO PORTFOLIOS — updated to use real pair names
// ════════════════════════════════════════════════════════════════════════════
const DEMO_PORTFOLIOS: IPortfolio[] = [
  { name: "All 6 Pairs",              currencyPairs: [...PAIRS],                                      initialCapital: 30000, currency: "USD", riskLevel: "medium", tradingStyle: "swing" },
  { name: "EUR Focus",                currencyPairs: ["EUR/USD", "EUR/JPY", "USD/CHF"],               initialCapital: 15000, currency: "USD", riskLevel: "low",    tradingStyle: "long-term" },
  { name: "High Beta — Carry",        currencyPairs: ["GBP/JPY", "USD/JPY", "GBP/USD"],              initialCapital: 10000, currency: "USD", riskLevel: "high",   tradingStyle: "day-trading" },
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
      setPair(portfolioPairs[0]); setTab("overview")
    }
  }, [portfolioIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePortfolioSelect = useCallback((i: number) => {
    setPortfolioIdx(i)
    const p     = portfolios[i]
    const first = p.currencyPairs.find(x => PAIRS.includes(x as Pair)) as Pair | undefined
    if (first) { setPair(first); setTab("overview") }
  }, [portfolios])

  const handlePairChange = useCallback((p: Pair) => {
    setPair(p); setTab("overview")
  }, [])

  const anyLoading = portfolioPairs.some(p => liveData[p]?.loading)

  return (
    <div className="min-h-screen bg-[#040c18]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl transition-all duration-1000"
          style={{ background: `radial-gradient(circle,${c.hex}12,transparent 70%)` }} />
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
            <p className="text-xs text-slate-500 mt-1">Live signals from Central Brain v7 — 5-agent ensemble</p>
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
            <button onClick={refetchAll} disabled={anyLoading} title="Refresh all pairs"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-40 transition-colors">
              <RefreshCw className={`h-4 w-4 text-slate-400 ${anyLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowHelp(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] transition-colors">
              <HelpCircle className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs text-slate-400">
              <span className="font-bold text-amber-400">Demo mode — </span>
              signals are real from your Azure API. Add portfolios to customise pair allocation.
            </p>
          </div>
        )}

        {/* Portfolio switcher */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Your Portfolios</p>
          <PortfolioCards portfolios={portfolios} active={portfolioIdx} onSelect={handlePortfolioSelect} liveData={liveData} />
        </section>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Balance",    value: `$${fmt(portfolio.initialCapital)}`,                                              color: "text-white" },
            { label: "Projected",  value: `$${fmt(totalProjected, 0)}`,                                                    color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Net P&L",    value: `${netPnL >= 0 ? "+" : "−"}$${fmt(Math.abs(netPnL), 0)}`,                       color: netPnL >= 0 ? "text-emerald-400" : "text-rose-400" },
            { label: "Pairs",      value: String(portfolioPairs.length),                                                   color: "text-white" },
            { label: "Risk Level", value: portfolio.riskLevel.toUpperCase(),                                               color: { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" }[portfolio.riskLevel] ?? "text-white" },
            { label: "Avg Conv.",  value: portfolioPairs.length > 0 ? `${avgConv}%` : "—",                                color: "text-blue-400" },
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

        {/* Active pair + tabs */}
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
                  {/* API key from live data */}
                  {liveData[pair]?.lastUpdated && (
                    <span className="text-[9px] text-slate-600">→ {PAIR_TO_API[pair]}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const i = portfolioPairs.indexOf(pair); if (i > 0) { setPair(portfolioPairs[i - 1]); setTab("overview") } }}
                disabled={portfolioPairs.indexOf(pair) <= 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-25 transition-all">
                <ChevronLeft className="h-4 w-4 text-slate-400" />
              </button>
              <span className="text-[10px] text-slate-600 w-14 text-center">{portfolioPairs.indexOf(pair) + 1} / {portfolioPairs.length}</span>
              <button
                onClick={() => { const i = portfolioPairs.indexOf(pair); if (i < portfolioPairs.length - 1) { setPair(portfolioPairs[i + 1]); setTab("overview") } }}
                disabled={portfolioPairs.indexOf(pair) >= portfolioPairs.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.18] disabled:opacity-25 transition-all">
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="border-t border-white/[0.06] flex overflow-x-auto scrollbar-none">
            {TABS.map(t => {
              const active = t.id === tab
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 shrink-0 px-4 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${active ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
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