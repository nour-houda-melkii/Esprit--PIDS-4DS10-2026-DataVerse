"use client"

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { FloatingNavbar } from "@/components/floating-navbar"
import { useAuth } from "@/lib/auth-context"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

import {
  Newspaper,
  Sparkles,
  Globe,
  BarChart3,
} from "lucide-react"

type Portfolio = {
  initialCapital?: number
  currencyPairs?: string[]
}

type PriceData = {
  pair: string
  price: number | null
  changePercent: number | null
  chart: { time: string; price: number }[]
}

function pairToYahooTicker(pair: string) {
  return `${pair.replace("/", "")}=X`
}

function formatMoney(value?: number | null) {
  if (!value) return "$0.00"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function formatNumber(
  value?: number | null,
  digits = 4
) {
  if (!value) return "0.0000"

  return value.toFixed(digits)
}

export default function ProfilePage() {
  const router = useRouter()

  const { user, isAuthenticated } =
    useAuth()

  const portfolio: Portfolio =
    user?.portfolios?.[0] || {}

  const pairs = useMemo(() => {
    return portfolio.currencyPairs?.length
      ? portfolio.currencyPairs
      : [
          "EUR/USD",
          "GBP/USD",
          "USD/JPY",
          "EUR/GBP",
        ]
  }, [portfolio])

  const [selectedPair, setSelectedPair] =
    useState("EUR/USD")

  const [prices, setPrices] = useState<
    Record<string, PriceData>
  >({})

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  const fetchPrice = async (
    pair: string
  ): Promise<PriceData> => {
    try {
      const ticker = pairToYahooTicker(pair)

      const res = await fetch(
        `/api/yahoo?ticker=${ticker}`
      )

      const data = await res.json()

      const result =
        data?.chart?.result?.[0]

      const meta = result?.meta

      const basePrice =
        meta?.regularMarketPrice || 1

      const previousClose =
        meta?.chartPreviousClose || 1

      const changePercent =
        ((basePrice -
          previousClose) /
          previousClose) *
        100

      const chart = Array.from(
        { length: 24 },
        (_, i) => {
          const volatility =
            (Math.random() - 0.5) *
            basePrice *
            0.03

          return {
            time: `${i}:00`,
            price:
              basePrice +
              volatility,
          }
        }
      )

      return {
        pair,
        price: basePrice,
        changePercent,
        chart,
      }
    } catch {
      return {
        pair,
        price: null,
        changePercent: null,
        chart: [],
      }
    }
  }

  const loadPrices = async () => {
    setLoading(true)

    try {
      const results = await Promise.all(
        pairs.map(fetchPrice)
      )

      setPrices(
        Object.fromEntries(
          results.map((item) => [
            item.pair,
            item,
          ])
        )
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrices()
  }, [])

  const selectedPrice =
    prices[selectedPair]

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <FloatingNavbar />

      <main className="mx-auto max-w-[95%] px-5 py-24">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white">
            Trader Profile
          </h1>

          <p className="mt-2 text-lg text-slate-400">
            Welcome back{" "}
            <span className="font-bold text-yellow-400">
              {user?.name}
            </span>
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {user?.email}
          </p>
        </div>

        {/* STATS */}
        <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {/* CAPITAL */}
          <div className="rounded-[22px] border border-yellow-500/10 bg-[#081121]/90 p-4">
            <p className="text-xs text-slate-400">
              Portfolio Capital
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {formatMoney(
                portfolio?.initialCapital
              )}
            </h2>
          </div>

          {/* PAIR */}
          <div className="rounded-[22px] border border-yellow-500/10 bg-[#081121]/90 p-4">
            <p className="text-xs text-slate-400">
              Current Pair
            </p>

            <select
              value={selectedPair}
              onChange={(e) =>
                setSelectedPair(
                  e.target.value
                )
              }
              className="mt-3 w-full rounded-2xl border border-yellow-500/10 bg-[#020617] px-4 py-3 text-xl font-black text-white outline-none"
            >
              {pairs.map((pair) => (
                <option
                  key={pair}
                  value={pair}
                >
                  {pair}
                </option>
              ))}
            </select>
          </div>

          {/* PRICE */}
          <div className="rounded-[22px] border border-yellow-500/10 bg-[#081121]/90 p-4">
            <p className="text-xs text-slate-400">
              Live Price
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {formatNumber(
                selectedPrice?.price
              )}
            </h2>
          </div>

          {/* CHANGE */}
          <div className="rounded-[22px] border border-yellow-500/10 bg-[#081121]/90 p-4">
            <p className="text-xs text-slate-400">
              Daily Change
            </p>

            <h2
              className={`mt-3 text-3xl font-black ${
                Number(
                  selectedPrice?.changePercent ||
                    0
                ) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {selectedPrice?.changePercent
                ? `${selectedPrice.changePercent.toFixed(
                    2
                  )}%`
                : "0.00%"}
            </h2>
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT */}
          <div>
            <section className="rounded-[20px] border border-yellow-500/10 bg-[#081121]/90 p-4">
              {/* CHART HEADER */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Live Trading Chart
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Real-time forex market
                    performance
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
                  <p className="text-xs text-slate-400">
                    Current Price
                  </p>

                  <h3 className="text-xl font-black text-emerald-400">
                    {formatNumber(
                      selectedPrice?.price
                    )}
                  </h3>
                </div>
              </div>

              {/* CHART */}
              <div className="h-[260px] overflow-hidden rounded-[20px] border border-white/5 bg-black/20 p-3">
                {selectedPrice?.chart
                  ?.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={
                        selectedPrice.chart
                      }
                      margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="goldChart"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#facc15"
                            stopOpacity={0.45}
                          />

                          <stop
                            offset="100%"
                            stopColor="#facc15"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#ffffff08"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                      />

                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        domain={[
                          (
                            dataMin: number
                          ) =>
                            dataMin * 0.995,
                          (
                            dataMax: number
                          ) =>
                            dataMax * 1.005,
                        ]}
                      />

                      <Tooltip
                        contentStyle={{
                          background:
                            "#020617",
                          border:
                            "1px solid rgba(255,255,255,0.1)",
                          borderRadius:
                            "14px",
                          color: "white",
                        }}
                      />

                      <Area
                        type="natural"
                        dataKey="price"
                        stroke="#facc15"
                        strokeWidth={4}
                        fill="url(#goldChart)"
                        activeDot={{
                          r: 6,
                          fill: "#facc15",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    {loading
                      ? "Loading chart..."
                      : "No chart data"}
                  </div>
                )}
              </div>

              {/* WATCHLIST */}
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-3">
                  <BarChart3 className="text-yellow-400" />

                  <h2 className="text-2xl font-black">
                    Watchlist
                  </h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {pairs.map((pair) => {
                    const data =
                      prices?.[pair]

                    return (
                      <button
                        key={pair}
                        onClick={() =>
                          setSelectedPair(
                            pair
                          )
                        }
                        className={`min-w-[190px] rounded-3xl border p-4 text-left transition ${
                          selectedPair ===
                          pair
                            ? "border-yellow-500/30 bg-yellow-500/10"
                            : "border-white/5 bg-black/10 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black">
                              {pair}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              Live Forex
                            </p>
                          </div>

                          <div className="text-right">
                            <h3 className="text-2xl font-black">
                              {formatNumber(
                                data?.price
                              )}
                            </h3>

                            <p
                              className={`mt-1 text-sm font-bold ${
                                Number(
                                  data?.changePercent ||
                                    0
                                ) >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {data?.changePercent
                                ? data.changePercent.toFixed(
                                    2
                                  )
                                : "0.00"}
                              %
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <section className="w-full rounded-[22px] border border-yellow-500/10 bg-[#081121]/90 p-5">
              {(() => {
                const marketData: Record<
                  string,
                  {
                    news: string
                    signal: string
                    action: string
                    confidence: number
                  }
                > = {
                  "EUR/USD": {
                    news:
                      "EUR/USD gains momentum after strong European inflation data.",
                    signal:
                      "AI predicts bullish continuation on EUR/USD.",
                    action: "BUY",
                    confidence: 74,
                  },

                  "GBP/USD": {
                    news:
                      "GBP/USD rises after positive UK economic growth.",
                    signal:
                      "AI detects bullish pressure on GBP/USD.",
                    action: "BUY",
                    confidence: 69,
                  },

                  "USD/JPY": {
                    news:
                      "USD/JPY weakens after Bank of Japan comments.",
                    signal:
                      "AI predicts bearish movement on USD/JPY.",
                    action: "SELL",
                    confidence: 81,
                  },

                  "EUR/GBP": {
                    news:
                      "EUR/GBP remains stable amid mixed Eurozone data.",
                    signal:
                      "AI expects consolidation on EUR/GBP.",
                    action: "HOLD",
                    confidence: 58,
                  },
                }

                const current =
                  marketData[
                    selectedPair
                  ] ||
                  marketData["EUR/USD"]

                return (
                  <>
                    {/* HEADER */}
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black leading-none text-white">
                          Market
                          <br />
                          Feed
                        </h2>

                        <p className="mt-2 text-sm text-slate-400">
                          Live news & AI
                          signals
                        </p>
                      </div>

                      <button
                        onClick={loadPrices}
                        className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* NEWS */}
                      <div className="rounded-2xl border border-yellow-500/10 bg-[#020617]/70 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10">
                            <Newspaper className="h-6 w-6 text-yellow-400" />
                          </div>

                          <div>
                            <h3 className="text-lg font-black">
                              Market News
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {selectedPair} Update
                            </p>
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-300">
                          {current.news}
                        </p>
                      </div>

                      {/* SIGNAL */}
                      <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                              <Sparkles className="h-6 w-6 text-emerald-400" />
                            </div>

                            <div>
                              <h3 className="text-lg font-black">
                                AI Signal
                              </h3>

                              <p className="text-sm text-slate-500">
                                Multi-Agent AI
                              </p>
                            </div>
                          </div>

                          <div
                            className={`rounded-full px-4 py-1 text-sm font-bold ${
                              current.action === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : current.action === "SELL"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {current.action}
                          </div>
                        </div>

                        <p className="mb-3 text-sm leading-relaxed text-slate-300">
                          {current.signal}
                        </p>

                        <div className="h-2 overflow-hidden rounded-full bg-black/30">
                          <div
                            style={{
                              width: `${current.confidence}%`,
                            }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-yellow-400 transition-all duration-500"
                          />
                        </div>

                        <div className="mt-2 flex justify-between text-xs">
                          <span className="text-slate-500">
                            Confidence
                          </span>

                          <span className="font-bold text-white">
                            {current.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
                            <Globe className="h-6 w-6 text-cyan-400" />
                          </div>

                          <div>
                            <h3 className="text-lg font-black">
                              Market Status
                            </h3>

                            <p className="text-sm text-slate-500">
                              {selectedPair} market active
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </section>
          </div>
        </div>
      </main>
=======
import { useState, useMemo, useCallback, useEffect } from "react"
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Info, Zap, Shield, AlertTriangle, CheckCircle, Brain, Lightbulb,
  Activity, BarChart2, Target, Clock, X, ArrowUpRight, ArrowDownRight,
  Layers, Eye, Globe, FlaskConical, LayoutDashboard, ArrowRight,
  HelpCircle, User, Briefcase, Sliders, PieChart, Filter,
} from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar as ReRadar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, BarChart, Bar, Cell, CartesianGrid,
  ComposedChart, Line,
} from "recharts"
import { useAuth } from "@/lib/auth-context"

// ================== Helper functions ==================
function fmt(n: number, dec = 0): string {
  const fixed = n.toFixed(dec)
  const [int, d] = fixed.split(".")
  const intF = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return d !== undefined ? `${intF}.${d}` : intF
}

// ================== Synthetic data generator ==================
function generatePairData(pair: string, riskLevel: string, style: string) {
  // Generate realistic forex demo data based on pair and risk profile
  const base = pair.split("/")[0]
  const quote = pair.split("/")[1]

  // Signal direction influenced by risk: higher risk = more aggressive signals
  const riskFactor = riskLevel === "high" ? 1.2 : riskLevel === "medium" ? 1.0 : 0.8

  // Random seed based on pair
  const seed = pair.split("").reduce((a, c) => a + c.charCodeAt(0), 0)

  // Determine signal
  const signalRand = (seed % 100) / 100
  const signal: "BUY" | "SELL" | "HOLD" = signalRand < 0.4 ? "BUY" : signalRand < 0.8 ? "SELL" : "HOLD"

  // Growth % based on signal and risk
  let growth = (signal === "BUY" ? 2.5 : signal === "SELL" ? -2.0 : 0.5) * riskFactor
  growth = Number(growth.toFixed(1))

  // Conviction based on signal strength
  const conviction = Math.min(95, Math.max(35, 60 + (seed % 30) * (riskLevel === "high" ? 1.2 : 1)))
  const price = (100 + (seed % 50) / 10).toFixed(4)
  const change = (signal === "BUY" ? 0.002 : signal === "SELL" ? -0.0015 : 0.0005) * riskFactor

  const tp = (signal === "BUY" ? 1.02 : signal === "SELL" ? 0.98 : 1.0) * parseFloat(price)
  const sl = (signal === "BUY" ? 0.98 : signal === "SELL" ? 1.02 : 0.995) * parseFloat(price)

  const pips = Math.round(Math.abs(growth) * 100)
  const rr = signal === "HOLD" ? "1.0:1" : `${(Math.random() * 1.5 + 1.5).toFixed(1)}:1`

  const timeframe = signal === "HOLD" ? "Watch only" : riskLevel === "high" ? "1–4 hrs" : riskLevel === "medium" ? "4–12 hrs" : "1–3 days"

  const volatility: "LOW" | "MEDIUM" | "HIGH" = riskLevel === "high" ? "HIGH" : riskLevel === "medium" ? "MEDIUM" : "LOW"

  const history = Array.from({ length: 14 }, (_, i) => {
    const basePrice = parseFloat(price) * (0.98 + 0.04 * i / 13)
    return Number(basePrice.toFixed(4))
  })

  const radar = {
    Technical: 50 + (seed % 40),
    Macro: 40 + (seed % 50),
    Sentiment: 30 + (seed % 60),
    Momentum: 40 + (seed % 50),
    Risk: riskLevel === "high" ? 80 : riskLevel === "medium" ? 60 : 40,
  }

  return {
    signal,
    growth,
    conviction,
    price: price.toString(),
    change,
    target: { entry: price, tp: tp.toFixed(4), sl: sl.toFixed(4) },
    pips,
    rr,
    timeframe,
    volatility,
    history,
    radar,
  }
}

function generateReasoning(pair: string, signal: "BUY" | "SELL" | "HOLD", agents: string[]) {
  const base = pair.split("/")[0]
  const quote = pair.split("/")[1]
  const factors = [
    {
      label: `${base} Central Bank Outlook`,
      detail: `The central bank of ${base} has signaled a ${signal === "BUY" ? "hawkish" : signal === "SELL" ? "dovish" : "neutral"} stance, influencing rate expectations.`,
      agent: "Macro",
      strength: 70 + Math.floor(Math.random() * 20),
    },
    {
      label: `${quote} Economic Momentum`,
      detail: `Recent data from ${quote} shows ${signal === "SELL" ? "strong" : signal === "BUY" ? "weak" : "mixed"} momentum, supporting the signal direction.`,
      agent: "Macro",
      strength: 60 + Math.floor(Math.random() * 25),
    },
    {
      label: "Technical Pattern",
      detail: `A ${signal === "BUY" ? "bullish flag" : signal === "SELL" ? "head and shoulders" : "consolidation"} pattern has formed on the 4H chart.`,
      agent: "Technical",
      strength: 65 + Math.floor(Math.random() * 20),
    },
    {
      label: "Sentiment Extreme",
      detail: `Retail positioning is ${signal === "BUY" ? "heavily short" : signal === "SELL" ? "overwhelmingly long" : "neutral"}, a contrarian signal.`,
      agent: "Sentiment",
      strength: 55 + Math.floor(Math.random() * 30),
    },
  ]
  const risks = [
    {
      label: "Unexpected Central Bank Move",
      detail: `A surprise policy shift from ${base} or ${quote} could invalidate the signal.`,
      severity: "HIGH" as const,
    },
    {
      label: "Risk Sentiment Shift",
      detail: `A sudden risk-on/off event may override fundamentals.`,
      severity: "MEDIUM" as const,
    },
  ]
  const macro = {
    rate_base: `${(Math.random() * 2 + 4).toFixed(2)}%`,
    rate_quote: `${(Math.random() * 2 + 4).toFixed(2)}%`,
    differential: `${(Math.random() * 1 - 0.5).toFixed(2)}%`,
    gdp_base: `+${(Math.random() * 0.5 + 0.1).toFixed(1)}%`,
    gdp_quote: `+${(Math.random() * 0.5 + 0.1).toFixed(1)}%`,
    inflation_base: `${(Math.random() * 2 + 2).toFixed(1)}%`,
    inflation_quote: `${(Math.random() * 2 + 2).toFixed(1)}%`,
  }
  const technical = {
    trend: signal === "BUY" ? "Bullish" : signal === "SELL" ? "Bearish" : "Neutral",
    support: (parseFloat(macro.rate_base) * 0.98).toFixed(4),
    resistance: (parseFloat(macro.rate_base) * 1.02).toFixed(4),
    rsi: 50 + (signal === "BUY" ? 10 : signal === "SELL" ? -10 : 0) + Math.floor(Math.random() * 10),
    pattern: signal === "BUY" ? "Ascending Triangle" : signal === "SELL" ? "Descending Triangle" : "Range",
    volume: "Average",
  }
  return {
    headline: `${signal} signal on ${pair} driven by ${agents.join(", ")}`,
    summary: `The AI has generated a ${signal} signal based on a confluence of factors.`,
    factors,
    risks,
    macro,
    technical,
    agents,
  }
}

// ================== Helper components ==================
function sc(s: "BUY"|"SELL"|"HOLD") {
  return {
    BUY:  { accent:"#10b981", bar:"bg-emerald-500", text:"text-emerald-400", border:"border-emerald-500/40", bg:"bg-emerald-500/10", dot:"bg-emerald-400", glow:"shadow-[0_0_30px_rgba(16,185,129,0.12)]" },
    SELL: { accent:"#ef4444", bar:"bg-red-500",     text:"text-red-400",     border:"border-red-500/40",     bg:"bg-red-500/10",     dot:"bg-red-400",     glow:"shadow-[0_0_30px_rgba(239,68,68,0.12)]" },
    HOLD: { accent:"#f59e0b", bar:"bg-amber-500",   text:"text-amber-400",   border:"border-amber-500/40",   bg:"bg-amber-500/10",   dot:"bg-amber-400",   glow:"shadow-[0_0_30px_rgba(245,158,11,0.12)]" },
  }[s]
}

function Badge({ s, size="md" }: { s:"BUY"|"SELL"|"HOLD"; size?:"sm"|"md"|"lg" }) {
  const c = sc(s), Icon = s==="BUY" ? TrendingUp : s==="SELL" ? TrendingDown : Minus
  const sz = { sm:"px-2 py-0.5 text-[9px] gap-1", md:"px-3 py-1 text-xs gap-1.5", lg:"px-4 py-2 text-sm gap-2" }
  return <span className={`inline-flex items-center rounded-full border font-black tracking-widest ${sz[size]} ${c.bg} ${c.border} ${c.text}`}><Icon className={size==="lg"?"h-4 w-4":"h-3 w-3"}/>{s}</span>
}

function DecisionBadge({ d }: { d:"PROCEED"|"REDUCE"|"SKIP"|"HOLD" }) {
  const map = { PROCEED:{cls:"bg-emerald-500/10 border-emerald-500/30 text-emerald-400",Icon:CheckCircle}, REDUCE:{cls:"bg-amber-500/10 border-amber-500/30 text-amber-400",Icon:AlertTriangle}, SKIP:{cls:"bg-red-500/10 border-red-500/30 text-red-400",Icon:Shield}, HOLD:{cls:"bg-slate-500/10 border-slate-500/30 text-slate-400",Icon:Minus} }[d]
  return <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black ${map.cls}`}><map.Icon className="h-3.5 w-3.5"/>{d}</span>
}

function Pbar({ v, color, label, note }: { v:number; color:string; label?:string; note?:string }) {
  return (
    <div>
      {(label||note) && <div className="flex justify-between mb-1.5"><span className="text-xs text-slate-400">{label}</span><span className="text-[10px] text-slate-600">{note}</span></div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${color} transition-all duration-700`} style={{width:`${v}%`}}/></div>
        <span className="text-xs font-black text-white w-9 text-right">{v}%</span>
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/8 shrink-0">
        <Icon className="h-4 w-4 text-slate-400"/>
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Modal({ open, onClose, title, subtitle, children }: { open:boolean; onClose:()=>void; title:string; subtitle?:string; children:React.ReactNode }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (open) { document.addEventListener("keydown", handleEsc); document.body.style.overflow = "hidden" }
    return () => { document.removeEventListener("keydown", handleEsc); document.body.style.overflow = "" }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={onClose}/>
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#070e1e] shadow-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-start justify-between border-b border-white/8 px-6 py-5 shrink-0">
          <div><p className="text-base font-black text-white">{title}</p>{subtitle&&<p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 hover:border-white/25 transition-colors"><X className="h-4 w-4 text-slate-400"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  )
}

// ================== Page 1: Overview ==================
function PageOverview({ pair, capital, data }: { pair: string; capital: number; data: any }) {
  const sig = data.signal
  const c = sc(sig)
  const g = data.growth
  const conv = data.conviction
  const price = data.price
  const change = data.change
  const t = data.target
  const hist = data.history
  const histData = hist.map((v: number, i: number) => ({ i, v }))
  const projected = capital * (1 + g / 100)
  const gain = projected - capital

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border ${c.border} ${c.glow}`} style={{background:"linear-gradient(135deg, #0c1524 0%, #070e1e 100%)"}}>
        <div className="absolute top-0 right-0 w-72 h-72 pointer-events-none opacity-[0.08] blur-3xl" style={{background:`radial-gradient(circle, ${c.accent}, transparent 70%)`,transform:"translate(30%,-30%)"}}/>
        <div className="relative p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10">
                <span className="absolute -top-2 -left-2 text-3xl drop-shadow-lg">{pair.split("/")[0]}</span>
                <span className="absolute -bottom-2 -right-2 text-3xl drop-shadow-lg">{pair.split("/")[1]}</span>
              </div>
              <div>
                <p className="font-mono text-3xl font-black tracking-widest text-white leading-none">{pair}</p>
                <p className="text-xs text-slate-500 mt-1.5">{pair.split("/")[0]} · {pair.split("/")[1]} · Spot Rate</p>
                <div className="mt-2"><Badge s={sig} size="lg"/></div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest">Conviction</p>
              <p className={`text-4xl font-black ${c.text}`}>{conv}<span className="text-lg text-slate-600">%</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Live Price</p>
              <p className="font-mono text-3xl font-black text-white">{price}</p>
              <p className={`text-sm font-mono mt-1 ${change>=0?"text-emerald-400":"text-red-400"}`}>{change>=0?"▲":"▼"} {Math.abs(change).toFixed(4)} ({g>=0?"+":""}{g.toFixed(2)}%)</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">14-period trend</p>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={histData} margin={{top:2,right:0,left:0,bottom:2}}>
                  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={c.accent} stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke={c.accent} strokeWidth={2} fill="url(#sg)" dot={false} isAnimationActive={false}/>
                  <YAxis domain={["auto","auto"]} hide/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-black/30 border border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Conviction Score</p>
              <p className={`text-xs font-bold ${c.text}`}>{conv>=75?"High — strong alignment":conv>=60?"Moderate — valid signal":"Low — exercise caution"}</p>
            </div>
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full ${c.bar} rounded-full`} style={{width:`${conv}%`}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Trade parameters */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Trade Parameters</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {Icon:Clock,    label:"Timeframe",   val:data.timeframe, col:"text-white"},
            {Icon:Target,   label:"Pip Target",  val:`~${data.pips}`, col:"text-white"},
            {Icon:BarChart2,label:"Risk/Reward", val:data.rr, col:"text-white"},
            {Icon:Activity, label:"Volatility",  val:data.volatility, col:data.volatility==="HIGH"?"text-red-400":data.volatility==="LOW"?"text-emerald-400":"text-amber-400"},
          ].map(m=>(
            <div key={m.label} className="rounded-2xl border border-white/8 bg-[#0c1524]/80 p-4">
              <div className="flex items-center gap-2 mb-3 text-slate-600"><m.Icon className="h-4 w-4"/><p className="text-[9px] uppercase tracking-wider">{m.label}</p></div>
              <p className={`text-lg font-black ${m.col}`}>{m.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capital projection */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Capital Projection</p>
        <div className="rounded-3xl border border-white/8 bg-[#0c1524]/80 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-white/5">
            {[
              {label:"Allocated",  val:`$${fmt(capital)}`,        sub:"Per-pair split",                          col:"text-white"},
              {label:"Projected",  val:`$${fmt(projected,0)}`,    sub:`After ${g>=0?"+":""}${g.toFixed(1)}%`,   col:g>=0?"text-emerald-400":"text-red-400"},
              {label:"Net P&L",    val:`${gain>=0?"+":"−"}$${fmt(Math.abs(gain),0)}`, sub:`${g>=0?"+":""}${g.toFixed(1)}%`, col:gain>=0?"text-emerald-400":"text-red-400"},
            ].map(s=>(
              <div key={s.label} className="px-4 py-5 text-center">
                <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">{s.label}</p>
                <p className={`text-xl font-black ${s.col}`}>{s.val}</p>
                <p className="text-[9px] text-slate-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
            {[
              {Icon:ArrowRight,    label:"Entry",      val:t.entry, col:"text-slate-300"},
              {Icon:ArrowUpRight,  label:"Take Profit",val:t.tp,    col:"text-emerald-400"},
              {Icon:ArrowDownRight,label:"Stop Loss",  val:t.sl,    col:"text-red-400"},
            ].map(l=>(
              <div key={l.label} className="flex items-center gap-3 px-4 py-4">
                <l.Icon className={`h-5 w-5 shrink-0 ${l.col}`}/>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-600">{l.label}</p><p className={`font-mono text-sm font-black mt-0.5 ${l.col}`}>{l.val}</p></div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 bg-black/20 px-5 py-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">Calculation: ${fmt(capital)} × (1 + {g>=0?"+":""}{g.toFixed(1)}%) = ${fmt(projected,0)} projected. Expected move derived from conviction ({conv}%) and volatility regime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================== Page 2: Technical ==================
function PageTechnical({ pair, data }: { pair: string; data: any }) {
  const sig = data.signal
  const c = sc(sig)
  const hist = data.history
  const t = data.target
  const radarData = Object.entries(data.radar).map(([k, v]) => ({ subject: k, value: v as number, fullMark: 100 }))
  const priceData = hist.map((v: number, i: number) => ({ i, v, sma: i >= 4 ? hist.slice(i - 4, i + 1).reduce((a: number, b: number) => a + b, 0) / 5 : v }))
  const yMin = Math.min(parseFloat(t.sl), hist[0]) * 0.9993
  const yMax = Math.max(parseFloat(t.tp), hist[hist.length - 1]) * 1.0007

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle icon={Activity} title="Price Action Chart" sub="14-period history with 5-period SMA, take profit and stop loss levels"/>
        <div className="rounded-3xl border border-white/8 bg-[#0c1524]/80 p-5">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={priceData} margin={{top:15,right:55,left:5,bottom:5}}>
              <defs><linearGradient id="pcg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c.accent} stopOpacity={0.2}/><stop offset="95%" stopColor={c.accent} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06"/>
              <XAxis dataKey="i" tick={{fill:"#475569",fontSize:9}} tickFormatter={v=>`T-${13-v}`}/>
              <YAxis domain={[yMin, yMax]} tick={{fill:"#475569",fontSize:9}} tickFormatter={v=>v.toFixed(4)} width={55}/>
              <Tooltip formatter={(v: number) => [v.toFixed(4)]} contentStyle={{background:"#0c1524",border:"1px solid #ffffff15",borderRadius:12,fontSize:11}}/>
              <ReferenceLine y={parseFloat(t.tp)} stroke="#10b981" strokeDasharray="6 3" strokeWidth={1.5} label={{value:`TP  ${t.tp}`,fill:"#10b981",fontSize:9,position:"insideRight"}}/>
              <ReferenceLine y={parseFloat(t.sl)} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{value:`SL  ${t.sl}`,fill:"#ef4444",fontSize:9,position:"insideRight"}}/>
              <ReferenceLine y={parseFloat(t.entry)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{value:`Entry`,fill:"#f59e0b",fontSize:9,position:"insideRight"}}/>
              <Area type="monotone" dataKey="v" stroke={c.accent} strokeWidth={2.5} fill="url(#pcg)" dot={false}/>
              <Line type="monotone" dataKey="sma" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/5">
            {[{col:c.accent,l:"Price"},{col:"#64748b",l:"SMA(5)"},{col:"#10b981",l:"Take Profit"},{col:"#ef4444",l:"Stop Loss"},{col:"#f59e0b",l:"Entry"}].map(x=>(
              <div key={x.l} className="flex items-center gap-1.5"><div className="h-0.5 w-4 rounded" style={{background:x.col}}/><span className="text-[10px] text-slate-500">{x.l}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <SectionTitle icon={Layers} title="Key Price Levels" sub="Support and resistance zones"/>
        <div className="space-y-3">
          {[
            {label:"Resistance",val:data.target.tp,pct:88,col:"text-red-400",bar:"bg-red-500",desc:"Overhead supply zone."},
            {label:"Current Price",val:data.price,pct:55,col:c.text,bar:c.bar,desc:"Live market price."},
            {label:"Support",val:data.target.sl,pct:14,col:"text-emerald-400",bar:"bg-emerald-500",desc:"Demand zone."},
          ].map(l=>(
            <div key={l.label} className="rounded-2xl border border-white/8 bg-[#0c1524]/80 p-5">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-28 shrink-0"><p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{l.label}</p><p className={`font-mono text-xl font-black ${l.col}`}>{l.val}</p></div>
                <div className="flex-1"><div className="h-2.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full ${l.bar} rounded-full`} style={{width:`${l.pct}%`}}/></div></div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle icon={BarChart2} title="Technical Indicators" sub="Current readings"/>
        <div className="grid grid-cols-2 gap-3">
          {[
            {label:"Trend Direction",val:data.signal === "BUY" ? "Bullish" : data.signal === "SELL" ? "Bearish" : "Neutral", note:"Overall price bias", col:c.text},
            {label:"RSI (14)",val:"52", note:"Neutral", col:"text-slate-200"},
            {label:"Volume",val:"Average", note:"Relative to 20-day", col:"text-slate-200"},
            {label:"Chart Pattern",val:data.signal === "BUY" ? "Ascending Triangle" : data.signal === "SELL" ? "Descending Triangle" : "Range", note:"Key formation", col:c.text},
          ].map(ind=>(
            <div key={ind.label} className="rounded-2xl border border-white/8 bg-[#0c1524]/80 p-4">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-3">{ind.label}</p>
              <p className={`text-sm font-black leading-tight ${ind.col}`}>{ind.val}</p>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{ind.note}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle icon={Eye} title="Signal Strength Radar" sub="How strongly each dimension supports this signal"/>
        <div className="rounded-3xl border border-white/8 bg-[#0c1524]/80 p-5">
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData} outerRadius={95}>
              <PolarGrid stroke="#ffffff0e"/>
              <PolarAngleAxis dataKey="subject" tick={{fill:"#64748b",fontSize:11,fontWeight:700}}/>
              <ReRadar name={pair} dataKey="value" stroke={c.accent} fill={c.accent} fillOpacity={0.15} strokeWidth={2} dot={{fill:c.accent,r:3}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ================== Page 3: Reasoning ==================
function PageReasoning({ pair, data }: { pair: string; data: any }) {
  const sig = data.signal
  const c = sc(sig)
  const r = data.reasoning
  const [openFactor, setOpenFactor] = useState<number|null>(null)
  const [openRisk, setOpenRisk] = useState<number|null>(null)
  const sv: Record<'HIGH'|'MEDIUM'|'LOW', { cls: string; label: string }> = {
    HIGH: { cls: "text-red-400 bg-red-500/10 border-red-500/30", label: "High" },
    MEDIUM: { cls: "text-amber-400 bg-amber-500/10 border-amber-500/30", label: "Medium" },
    LOW: { cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", label: "Low" },
  }

  return (
    <div className="space-y-8">
      <div className={`rounded-3xl border ${c.border} ${c.glow} p-6`} style={{background:"linear-gradient(135deg, #0c1524, #070e1e)"}}>
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-6 w-6 text-slate-400"/>
          <div className="flex-1"><p className="text-base font-black text-white">AI Signal Reasoning</p><p className="text-xs text-slate-500 mt-0.5">Why the AI is signalling {sig} on {pair}</p></div>
          <Badge s={sig}/>
        </div>
        <div className={`rounded-2xl ${c.bg} border ${c.border} px-5 py-4 mb-4`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${c.text}`}>{r.headline}</p>
          <p className="text-sm text-slate-200 leading-relaxed">{r.summary}</p>
        </div>
      </div>

      <div>
        <SectionTitle icon={Lightbulb} title="Why This Signal?" sub="Each factor independently confirmed by a different AI agent — tap any for full detail"/>
        <div className="space-y-3">
          {r.factors.map((f: any, i: number) => (
            <button key={i} onClick={() => setOpenFactor(i)} className="w-full text-left rounded-3xl border border-white/8 bg-[#0c1524]/80 p-5 hover:border-white/15 transition-all group">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${c.bg} border ${c.border}`}><span className={`text-base font-black ${c.text}`}>{i+1}</span></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-black text-white">{f.label}</p>
                    <span className="rounded-full border border-blue-500/25 bg-blue-500/8 px-2 py-0.5 text-[9px] font-bold text-blue-400">{f.agent}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{f.detail}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full ${c.bar} rounded-full`} style={{width:`${f.strength}%`}}/></div>
                    <span className={`text-[10px] font-black ${c.text}`}>{f.strength}%</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 mt-1 shrink-0"/>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Modal open={openFactor !== null} onClose={() => setOpenFactor(null)} title={r.factors[openFactor!]?.label} subtitle="Full Analysis">
        {openFactor !== null && (
          <div className="space-y-4">
            <p className="text-sm text-slate-200">{r.factors[openFactor].detail}</p>
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
              <Pbar v={r.factors[openFactor].strength} color={c.bar} label="Signal Contribution"/>
            </div>
          </div>
        )}
      </Modal>

      <div>
        <SectionTitle icon={AlertTriangle} title="What Could Go Wrong?" sub="Events that would invalidate this signal"/>
        <div className="space-y-3">
          {r.risks.map((risk: any, i: number) => {
            const s = sv[risk.severity as keyof typeof sv]
            return (
              <button key={i} onClick={() => setOpenRisk(i)} className="w-full text-left rounded-3xl border border-white/8 bg-[#0c1524]/80 p-5 hover:border-amber-500/15 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${s.cls}`}><span className="text-base font-black">!</span></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-black text-white">{risk.label}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{risk.detail}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 mt-1 shrink-0"/>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ================== Page 4: Scenarios ==================
function PageScenarios({ pair, capital, data }: { pair: string; capital: number; data: any }) {
  const [activeId, setActiveId] = useState("fed_hawkish")
  const [showSteps, setShowSteps] = useState(false)
  const sig = data.signal
  const g = data.growth

  const scenarios = [
    { id:"fed_hawkish", name:"Fed Hawkish Surprise", emoji:"🏦", probability:28, shockType:"bearish" as const, shockMagnitude:0.72,
      description:"The Fed signals rates must stay higher for longer.",
      macroContext:"USD rallies, risk assets sell off.",
      triggerEvent:"FOMC minutes or US CPI beat",
      pairEffects:{ [pair]:{direction: sig === "BUY" ? -1 : sig === "SELL" ? 1 : 0, magnitude:0.8} } },
    { id:"risk_off", name:"Global Risk-Off Shock", emoji:"⚡", probability:18, shockType:"bearish" as const, shockMagnitude:0.88,
      description:"Sudden flight to safety.",
      macroContext:"JPY, CHF surge, equities fall.",
      triggerEvent:"VIX spike >25",
      pairEffects:{ [pair]:{direction: pair.includes("JPY") || pair.includes("CHF") ? 1 : -1, magnitude:0.9} } },
    { id:"soft_landing", name:"US Soft Landing", emoji:"🌤️", probability:42, shockType:"bullish" as const, shockMagnitude:0.55,
      description:"Inflation cools, labour stays resilient.",
      macroContext:"USD weakens, risk assets recover.",
      triggerEvent:"CPI MoM <0.2% + NFP 150-200K",
      pairEffects:{ [pair]:{direction: sig === "BUY" ? 1 : sig === "SELL" ? -1 : 0, magnitude:0.6} } },
  ]
  const scenario = scenarios.find(s => s.id === activeId)!

  const computeOutcome = (scenario: any) => {
    const effect = scenario.pairEffects[pair] ?? { direction: 0, magnitude: 0.3 }
    const signalDir = sig === "BUY" ? 1 : sig === "SELL" ? -1 : 0
    const alignment = signalDir * effect.direction
    const shockImpact = effect.magnitude * scenario.shockMagnitude
    const adjustedGrowth = g + alignment * shockImpact * 3.5
    const survival = Math.max(0.1, Math.min(0.97, 0.55 + alignment * 0.2 + (1 - scenario.shockMagnitude) * 0.15))
    const baseConv = data.conviction / 100
    const confidence = Math.max(0.1, Math.min(0.98, baseConv + alignment * 0.15 - (1 - survival) * 0.2))
    const decision: "PROCEED"|"REDUCE"|"SKIP"|"HOLD" = sig === "HOLD" ? "HOLD" : confidence >= 0.7 && survival >= 0.6 ? "PROCEED" : confidence >= 0.5 || survival >= 0.45 ? "REDUCE" : "SKIP"
    return { adjustedGrowth, capitalOutcome: capital * (1 + adjustedGrowth / 100), gainLoss: capital * (adjustedGrowth / 100), confidence, survival, decision }
  }

  const outcome = useMemo(() => computeOutcome(scenario), [scenario])

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 shrink-0"><FlaskConical className="h-6 w-6 text-blue-400"/></div>
          <div><p className="text-base font-black text-white">What-If Scenario Analysis</p><p className="text-xs text-slate-500 mt-0.5">How would {pair} respond to macro shocks?</p></div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Select a Macro Scenario</p>
        <div className="space-y-3">
          {scenarios.map(s => {
            const active = s.id === activeId
            const borderA = s.shockType === "bullish" ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-red-500/40 bg-red-500/[0.05]"
            const dotC = s.shockType === "bullish" ? "bg-emerald-400" : "bg-red-400"
            const o = computeOutcome(s)
            return (
              <button key={s.id} onClick={() => { setActiveId(s.id); setShowSteps(false) }} className={`w-full text-left rounded-3xl border p-5 transition-all ${active ? borderA : "border-white/8 bg-[#0c1524]/80 hover:border-white/15"}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-black text-white">{s.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0"><div className={`h-1.5 w-1.5 rounded-full ${dotC}`}/><span className="text-[10px] text-slate-500">{s.probability}% prob.</span></div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{s.description}</p>
                    {active && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-black/25 p-2.5 text-center"><p className="text-[9px] text-slate-600 mb-0.5">Confidence</p><p className={`text-sm font-black ${o.confidence >= 0.7 ? "text-emerald-400" : o.confidence >= 0.5 ? "text-amber-400" : "text-red-400"}`}>{Math.round(o.confidence*100)}%</p></div>
                        <div className="rounded-xl bg-black/25 p-2.5 text-center"><p className="text-[9px] text-slate-600 mb-0.5">Survival</p><p className="text-sm font-black text-blue-400">{Math.round(o.survival*100)}%</p></div>
                        <div className="rounded-xl bg-black/25 p-2.5 text-center"><p className="text-[9px] text-slate-600 mb-0.5">Return</p><p className={`text-sm font-black ${o.adjustedGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>{o.adjustedGrowth >= 0 ? "+" : ""}{o.adjustedGrowth.toFixed(1)}%</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Detailed Outcome — {scenario.name}</p>
        <div className="rounded-3xl border border-white/8 bg-[#0c1524]/80 overflow-hidden">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/6 bg-black/20 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Macro Impact</p><p className="text-xs text-slate-400 leading-relaxed">{scenario.macroContext}</p></div>
              <div className="rounded-2xl border border-white/6 bg-black/20 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-2">Trigger Event</p><p className="text-xs text-slate-400 leading-relaxed">{scenario.triggerEvent}</p></div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/6 bg-black/10 p-4">
              <Pbar v={Math.round(outcome.confidence*100)} color={outcome.confidence >= 0.7 ? "bg-emerald-500" : outcome.confidence >= 0.5 ? "bg-amber-500" : "bg-red-500"} label="Trade Confidence" note="≥70% to Proceed"/>
              <Pbar v={Math.round(outcome.survival*100)} color="bg-blue-500" label="Profitable Path Survival" note="≥60% to Proceed"/>
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/5 overflow-hidden rounded-2xl">
              <div className="bg-[#0c1524] p-4 text-center"><p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Current</p><p className="text-base font-black text-white">${fmt(capital)}</p></div>
              <div className="bg-[#0c1524] p-4 text-center"><p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Under Scenario</p><p className={`text-base font-black ${outcome.gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>${fmt(outcome.capitalOutcome, 0)}</p></div>
              <div className="bg-[#0c1524] p-4 text-center"><p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Net Change</p><p className={`text-base font-black ${outcome.gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>{outcome.gainLoss >= 0 ? "+" : "-"}${fmt(Math.abs(outcome.gainLoss), 0)}</p></div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-black/20 p-4">
              <div><p className="text-[10px] text-slate-600 mb-2">AI Recommendation</p><DecisionBadge d={outcome.decision}/></div>
              <button onClick={() => setShowSteps(v => !v)} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-blue-400 transition-all"><Info className="h-3.5 w-3.5"/>Logic<ChevronRight className={`h-3 w-3 transition-transform ${showSteps ? "rotate-90" : ""}`}/></button>
            </div>
            {showSteps && (
              <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] p-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/60 mb-4">Decision Logic Chain</p>
                <div className="space-y-3">
                  {[
                    `Scenario hits ${pair} with ${((scenario.pairEffects[pair]?.magnitude ?? 0) * scenario.shockMagnitude * 100).toFixed(0)}% effective intensity.`,
                    `Your ${sig} signal is ${outcome.adjustedGrowth >= g ? "REINFORCED" : "OPPOSED"} by the scenario.`,
                    `Adjusted return: base ${g}% → ${outcome.adjustedGrowth >= 0 ? "+" : ""}${outcome.adjustedGrowth.toFixed(2)}%.`,
                    `Confidence ${Math.round(outcome.confidence*100)}% vs 70% → ${outcome.confidence >= 0.7 ? "✓ PASS" : "✗ FAIL"}.`,
                    `Survival ${Math.round(outcome.survival*100)}% vs 60% → ${outcome.survival >= 0.6 ? "✓ PASS" : "✗ FAIL"}.`,
                    `Decision: ${outcome.decision}.`,
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[9px] font-black text-blue-400">{i+1}</span><p className="text-xs text-slate-400">{s}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ================== Page 5: Macro ==================
function PageMacro({ pair, data }: { pair: string; data: any }) {
  const sig = data.signal
  const c = sc(sig)
  const r = data.reasoning
  const [base, quote] = pair.split("/")

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle icon={Globe} title="Interest Rate Differential" sub="Primary driver of currency flows"/>
        <div className={`rounded-3xl border ${c.border} ${c.glow} p-6`} style={{background:"linear-gradient(135deg, #0c1524, #070e1e)"}}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 rounded-2xl border border-white/8 bg-black/20 p-4 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">{base}</p>
              <p className="font-mono text-2xl font-black text-white">{r.macro.rate_base}</p>
            </div>
            <div className="shrink-0 text-center px-2"><p className="text-[9px] text-slate-600 mb-1">GAP</p><p className={`text-xl font-black ${c.text}`}>{r.macro.differential}</p></div>
            <div className="flex-1 rounded-2xl border border-white/8 bg-black/20 p-4 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">{quote}</p>
              <p className="font-mono text-2xl font-black text-white">{r.macro.rate_quote}</p>
            </div>
          </div>
          <div className={`rounded-2xl ${c.bg} border ${c.border} p-4`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${c.text}`}>How This Drives {sig} on {pair}</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {sig === "BUY" ? `${base} has improving yield prospects relative to ${quote}.` : sig === "SELL" ? `${quote} holds a yield advantage.` : `The rate differential is balanced.`}
            </p>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle icon={BarChart2} title="Economic Data Comparison" sub={`${base} vs ${quote}`}/>
        <div className="rounded-3xl border border-white/8 bg-[#0c1524]/80 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/8 bg-black/20">
            <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{base}</p></div>
            <div className="px-4 py-3 text-center border-x border-white/8"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Metric</p></div>
            <div className="px-5 py-3 text-center"><p className="text-sm font-black text-white">{quote}</p></div>
          </div>
          {[
            {metric:"Interest Rate", base: r.macro.rate_base, quote: r.macro.rate_quote},
            {metric:"GDP Growth", base: r.macro.gdp_base, quote: r.macro.gdp_quote},
            {metric:"Inflation (CPI)", base: r.macro.inflation_base, quote: r.macro.inflation_quote},
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] border-b border-white/5 last:border-0">
              <div className="px-5 py-4 text-center"><p className="text-base font-black text-white">{row.base}</p></div>
              <div className="px-4 py-4 text-center border-x border-white/5"><p className="text-[9px] text-slate-600">{row.metric}</p></div>
              <div className="px-5 py-4 text-center"><p className="text-base font-black text-white">{row.quote}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================== Main Recommendations Page ==================
const SUB_PAGES = [
  {id:"overview",   label:"Overview",  icon:LayoutDashboard},
  {id:"technical",  label:"Technical", icon:Activity},
  {id:"reasoning",  label:"Reasoning", icon:Brain},
  {id:"scenarios",  label:"Scenarios", icon:FlaskConical},
  {id:"macro",      label:"Macro",     icon:Globe},
] as const
type SubPage = typeof SUB_PAGES[number]["id"]

export default function RecommendationsPage() {
  const { user } = useAuth()
  const portfolios = user?.portfolios || []
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState(0)
  const selectedPortfolio = portfolios.length > 0 ? portfolios[selectedPortfolioIndex] : null
  const portfolioBalance = selectedPortfolio?.initialCapital ?? 30000
  const pairs = selectedPortfolio?.currencyPairs?.length ? selectedPortfolio.currencyPairs : ["EUR/USD", "GBP/USD", "USD/JPY"] // fallback

  const [pairIdx, setPairIdx] = useState(0)
  const [subPage, setSubPage] = useState<SubPage>("overview")
  const [showExplainer, setShowExplainer] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [allocationStrategy, setAllocationStrategy] = useState<"equal" | "risk-weighted">("equal")
  const [riskTolerance, setRiskTolerance] = useState(50) // 0-100 slider

  // Generate synthetic data for each pair based on portfolio risk and style
  const pairDataMap = useMemo(() => {
    const map = new Map()
    pairs.forEach(p => {
      map.set(p, generatePairData(p, selectedPortfolio?.riskLevel || "medium", selectedPortfolio?.tradingStyle || "swing"))
    })
    return map
  }, [pairs, selectedPortfolio])

  // Compute allocation per pair
  const allocation = useMemo(() => {
    if (allocationStrategy === "equal") {
      const perPair = portfolioBalance / pairs.length
      return pairs.map(p => ({ pair: p, capital: perPair }))
    } else {
      // risk-weighted: higher risk pairs get smaller allocation
      const totalRiskWeight = pairs.reduce((sum, p) => {
        const data = pairDataMap.get(p)
        const riskFactor = data.volatility === "HIGH" ? 0.7 : data.volatility === "MEDIUM" ? 1.0 : 1.3
        return sum + riskFactor
      }, 0)
      return pairs.map(p => {
        const data = pairDataMap.get(p)
        const riskFactor = data.volatility === "HIGH" ? 0.7 : data.volatility === "MEDIUM" ? 1.0 : 1.3
        const capital = (riskFactor / totalRiskWeight) * portfolioBalance
        return { pair: p, capital }
      })
    }
  }, [allocationStrategy, portfolioBalance, pairs, pairDataMap])

  const currentPair = pairs[pairIdx] || pairs[0]
  const currentData = pairDataMap.get(currentPair) || generatePairData(currentPair, "medium", "swing")
  const currentCapital = allocation.find(a => a.pair === currentPair)?.capital || portfolioBalance / pairs.length

  // Portfolio-wide metrics
  const totalProjected = allocation.reduce((sum, a) => {
    const data = pairDataMap.get(a.pair)
    return sum + a.capital * (1 + (data?.growth || 0) / 100)
  }, 0)
  const bestPair = allocation.reduce((best, a) => {
    const g = pairDataMap.get(a.pair)?.growth || 0
    return g > (pairDataMap.get(best.pair)?.growth || 0) ? a : best
  }, allocation[0])
  const worstPair = allocation.reduce((worst, a) => {
    const g = pairDataMap.get(a.pair)?.growth || 0
    return g < (pairDataMap.get(worst.pair)?.growth || 0) ? a : worst
  }, allocation[0])
  const avgConviction = Math.round(allocation.reduce((sum, a) => sum + (pairDataMap.get(a.pair)?.conviction || 0), 0) / allocation.length)

  const goTo = useCallback((i: number) => {
    setPairIdx(Math.max(0, Math.min(pairs.length - 1, i)))
    setSubPage("overview")
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }, [pairs.length])

  const pickPair = useCallback((p: string) => {
    const i = pairs.indexOf(p)
    if (i !== -1) {
      setPairIdx(i)
      setSubPage("overview")
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
    }
  }, [pairs])

  if (!selectedPortfolio) {
    return (
      <div className="min-h-screen bg-[#050b17] flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-white text-lg">No portfolio selected</p>
          <p className="text-slate-500 text-sm mt-2">Please create a portfolio first</p>
        </div>
      </div>
    )
  }

  const roleColor = user?.role === "trader" ? "from-primary to-secondary" : "from-emerald-500 to-teal-500"
  const accentColor = user?.role === "trader" ? "text-primary" : "text-emerald-400"
  const borderAccent = user?.role === "trader" ? "border-primary/30" : "border-emerald-500/30"
  const bgAccent = user?.role === "trader" ? "bg-primary/5" : "bg-emerald-500/5"

  return (
    <div className="min-h-screen bg-[#050b17] flex">
      {/* Floating explainer button */}
      <button
        onClick={() => setShowExplainer(true)}
        className="fixed bottom-24 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 shadow-lg hover:bg-blue-700 transition-colors"
        title="How this page works"
      >
        <HelpCircle className="h-5 w-5 text-white" />
      </button>

      <Modal open={showExplainer} onClose={() => setShowExplainer(false)} title="What‑If Scenario Agent" subtitle="Scenario‑aware, explainable trading">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            This page demonstrates the <span className="font-bold text-blue-400">What‑If Scenario Agent</span>, an AI that tests every trade against realistic macro scenarios, now fully personalised to your portfolio.
          </p>
          <p className="text-sm text-slate-300">
            <span className="font-bold text-white">Your portfolio:</span> {selectedPortfolio.name} – {selectedPortfolio.riskLevel} risk, {selectedPortfolio.tradingStyle} style.
          </p>
          <p className="text-sm text-slate-300">
            <span className="font-bold text-white">Interactive controls:</span> Toggle allocation strategy (equal vs risk-weighted) and adjust risk tolerance to see how recommendations change.
          </p>
        </div>
      </Modal>

      {/* ========== LEFT SIDEBAR ========== */}
      <div className={`w-80 border-r border-white/6 bg-[#070d1c] transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-80'} flex flex-col`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/6">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            <Brain className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-black text-white">What‑If Agent</span>
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
            <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Portfolio selector */}
        <div className={`px-4 py-4 border-b border-white/6 ${sidebarCollapsed ? 'px-2 text-center' : ''}`}>
          {portfolios.length > 0 ? (
            sidebarCollapsed ? (
              <div className="flex justify-center">
                <Briefcase className="h-5 w-5 text-slate-400" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-slate-500 shrink-0" />
                <select
                  value={selectedPortfolioIndex}
                  onChange={(e) => setSelectedPortfolioIndex(Number(e.target.value))}
                  className="bg-[#0c1524] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-full"
                >
                  {portfolios.map((p, i) => (
                    <option key={i} value={i}>{p.name} (${fmt(p.initialCapital)})</option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div className={`flex items-center gap-1 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <User className="h-3 w-3 text-amber-400" />
              {!sidebarCollapsed && <span className="text-[9px] font-bold text-amber-400">DEMO</span>}
            </div>
          )}
        </div>

        {/* Portfolio summary cards */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 space-y-3 border-b border-white/6">
            <div className={`rounded-xl border ${borderAccent} ${bgAccent} p-3`}>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Portfolio</p>
              <p className="text-lg font-black text-white">{selectedPortfolio.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full ${borderAccent} ${bgAccent} ${accentColor}`}>
                  {selectedPortfolio.riskLevel} risk
                </span>
                <span className="text-[10px] text-slate-500">{selectedPortfolio.tradingStyle}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Total Balance</p>
                <p className="text-lg font-black text-white">${fmt(portfolioBalance)}</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Projected</p>
                <p className="text-lg font-black text-emerald-400">${fmt(totalProjected, 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Best Pair</p>
                <p className="text-sm font-black text-white">{bestPair.pair}</p>
                <p className="text-[10px] text-emerald-400">+{pairDataMap.get(bestPair.pair)?.growth.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Worst Pair</p>
                <p className="text-sm font-black text-white">{worstPair.pair}</p>
                <p className="text-[10px] text-red-400">{pairDataMap.get(worstPair.pair)?.growth.toFixed(1)}%</p>
              </div>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/5 p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Avg Conviction</p>
              <p className="text-xl font-black text-blue-400">{avgConviction}%</p>
            </div>
          </div>
        )}

        {/* Interactive controls */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-b border-white/6 space-y-4">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Allocation Strategy</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAllocationStrategy("equal")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    allocationStrategy === "equal"
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                      : 'bg-white/[0.02] border border-white/8 text-slate-500 hover:text-white'
                  }`}
                >
                  Equal
                </button>
                <button
                  onClick={() => setAllocationStrategy("risk-weighted")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    allocationStrategy === "risk-weighted"
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                      : 'bg-white/[0.02] border border-white/8 text-slate-500 hover:text-white'
                  }`}
                >
                  Risk-Weighted
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Risk Tolerance</p>
                <span className="text-[10px] text-slate-400">{riskTolerance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* Pair list */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className={`px-2 space-y-1 ${sidebarCollapsed ? 'px-1' : ''}`}>
            {pairs.map((p, i) => {
              const isActive = p === currentPair
              const data = pairDataMap.get(p)
              const s = data?.signal || "HOLD"
              const cl = sc(s)
              const g = data?.growth || 0
              return (
                <button
                  key={p}
                  onClick={() => pickPair(p)}
                  className={`w-full rounded-xl transition-all ${
                    isActive
                      ? `${cl.bg} ${cl.border} border`
                      : 'hover:bg-white/[0.04] border border-transparent'
                  } ${sidebarCollapsed ? 'px-2 py-3' : 'px-3 py-2'}`}
                >
                  {sidebarCollapsed ? (
                    <div className="flex flex-col items-center">
                      <div className="flex gap-0.5 mb-1">
                        <span className="text-xl">{p.split("/")[0]}</span>
                        <span className="text-xl">{p.split("/")[1]}</span>
                      </div>
                      <div className={`h-1.5 w-1.5 rounded-full ${cl.dot} mb-1`} />
                      <span className={`text-[9px] font-black ${cl.text}`}>{s}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5 text-2xl">
                        <span>{p.split("/")[0]}</span>
                        <span>{p.split("/")[1]}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-mono text-sm font-black text-white">{p}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black ${cl.text}`}>{s}</span>
                          <span className={`text-[9px] ${g >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {g >= 0 ? '+' : ''}{g.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${cl.dot}`} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 overflow-y-auto">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl opacity-[0.05]" style={{ background: `radial-gradient(circle, ${sc(currentData.signal).accent}, transparent 70%)` }} />
        </div>

        {/* Header with portfolio name */}
        <div className="border-b border-white/6 bg-[#050b17] sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${roleColor} text-sm font-black text-white`}>
                  {selectedPortfolio.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{selectedPortfolio.name}</p>
                  <p className="text-[10px] text-slate-500">{pairs.length} pairs · {selectedPortfolio.tradingStyle} style</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400">LIVE</span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">Allocated</p>
                  <p className="font-mono text-sm font-black text-white">${fmt(currentCapital, 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active pair header */}
        <div className="border-b border-white/6" style={{ background: `linear-gradient(135deg, ${sc(currentData.signal).accent}0a 0%, transparent 55%)` }}>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/[0.04] border border-white/10">
                  <span className="absolute -top-2 -left-2 text-3xl drop-shadow-xl">{currentPair.split("/")[0]}</span>
                  <span className="absolute -bottom-2 -right-2 text-3xl drop-shadow-xl">{currentPair.split("/")[1]}</span>
                </div>
                <div>
                  <p className="font-mono text-2xl font-black tracking-widest text-white leading-none">{currentPair}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{currentPair.split("/")[0]} / {currentPair.split("/")[1]} · Spot</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="font-mono text-base font-bold text-white">{currentData.price}</p>
                    <p className={`text-xs font-mono ${currentData.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {currentData.change >= 0 ? "▲" : "▼"} {Math.abs(currentData.change).toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge s={currentData.signal} size="lg" />
                <div className="mt-2.5">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">AI Conviction</p>
                  <p className={`text-2xl font-black ${sc(currentData.signal).text}`}>{currentData.conviction}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub‑page tabs */}
        <div className="sticky top-[73px] z-30 border-b border-white/8 bg-[#050b17]/95 backdrop-blur-xl">
          <div className="px-6">
            <div className="flex overflow-x-auto scrollbar-none">
              {SUB_PAGES.map(sp => {
                const active = sp.id === subPage
                return (
                  <button
                    key={sp.id}
                    onClick={() => setSubPage(sp.id)}
                    className={`flex items-center gap-2 shrink-0 px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                      active
                        ? `border-blue-500 text-white bg-blue-500/[0.06]`
                        : `border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]`
                    }`}
                  >
                    <sp.icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-blue-400" : ""}`} />
                    {sp.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-6 py-7 pb-28">
          <div key={`${currentPair}-${subPage}`} className="max-w-4xl">
            {subPage === "overview"  && <PageOverview   pair={currentPair} capital={currentCapital} data={currentData} />}
            {subPage === "technical" && <PageTechnical  pair={currentPair} data={currentData} />}
            {subPage === "reasoning" && <PageReasoning  pair={currentPair} data={currentData} />}
            {subPage === "scenarios" && <PageScenarios  pair={currentPair} capital={currentCapital} data={currentData} />}
            {subPage === "macro"     && <PageMacro      pair={currentPair} data={currentData} />}
          </div>
        </main>
      </div>
>>>>>>> c1081b6224a815e28d9773556d84306f4d8f6e84
    </div>
  )
}