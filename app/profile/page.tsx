"use client"

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
          </div>
  )
}