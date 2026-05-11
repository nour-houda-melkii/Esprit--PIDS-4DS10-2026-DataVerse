"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import { useRouter } from "next/navigation"

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

import { FloatingNavbar } from "@/components/floating-navbar"

import { useAuth } from "@/lib/auth-context"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Portfolio = {
  initialCapital?: number
  currencyPairs?: string[]
}

type PriceData = {
  pair: string
  price: number | null
  changePercent: number | null
  chart: {
    time: string
    price: number
  }[]
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function pairToYahooTicker(
  pair: string
) {
  return `${pair.replace("/", "")}=X`
}

function formatMoney(
  value?: number | null
) {
  if (!value) return "$0.00"

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(value)
}

function formatNumber(
  value?: number | null,
  digits = 4
) {
  if (!value) return "0.0000"

  return value.toFixed(digits)
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()

  const {
    user,
    isAuthenticated,
  } = useAuth()

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

  const [
    selectedPair,
    setSelectedPair,
  ] = useState("EUR/USD")

  const [prices, setPrices] =
    useState<
      Record<string, PriceData>
    >({})

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────

  const fetchPrice = async (
    pair: string
  ): Promise<PriceData> => {
    try {
      const ticker =
        pairToYahooTicker(pair)

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
        (_, i) => ({
          time: `${i}:00`,
          price:
            basePrice +
            (Math.random() - 0.5) *
              basePrice *
              0.03,
        })
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
      const results =
        await Promise.all(
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

  if (!isAuthenticated)
    return null

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      <FloatingNavbar />

      <main className="mx-auto max-w-[95%] px-5 pb-20 pt-[160px]">

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-4xl font-black">
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
      </main>
    </div>
  )
}