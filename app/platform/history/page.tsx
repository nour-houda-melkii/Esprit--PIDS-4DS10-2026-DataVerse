"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { History, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from "chart.js"
import { Line } from "react-chartjs-2"

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

// ── Types ────────────────────────────────────────────────────────────────────

interface PairSignal {
  pair: string
  signal: "BUY" | "SELL" | "HOLD"
  confidence: number
  gated: boolean
  probs: { buy: number; hold: number; sell: number }
  method: string
}

interface Snapshot {
  timestamp: string
  predictions_count: number
  errors_count: number
  pairs: PairSignal[]
}

const STORAGE_KEY = "fx_signal_history"
const MAX_SNAPSHOTS = 100

const PAIR_COLORS: Record<string, string> = {
  EURUSD: "#378ADD",
  GBPUSD: "#1D9E75",
  USDJPY: "#EF9F27",
  USDCHF: "#D85A30",
  EURJPY: "#7F77DD",
  GBPJPY: "#D4537E",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return ts
  }
}

function fmtShort(ts: string) {
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return ts
  }
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function SignalBadge({ signal, gated }: { signal: string; gated: boolean }) {
  const label = gated ? `${signal} (gated)` : signal
  const colors: Record<string, string> = {
    BUY:  "bg-green-500/10 text-green-400 border-green-500/20",
    SELL: "bg-red-500/10  text-red-400   border-red-500/20",
    HOLD: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  }
  const Icon = signal === "BUY" ? TrendingUp : signal === "SELL" ? TrendingDown : Minus
  const cls = gated
    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : (colors[signal] ?? colors.HOLD)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ConfBar({ value, signal }: { value: number; signal: string }) {
  const color =
    signal === "BUY"  ? "bg-green-500" :
    signal === "SELL" ? "bg-red-500"   : "bg-slate-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#1e293b]">
        <div className={`h-full rounded-full ${color}`} style={{ width: pct(value) }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct(value)}</span>
    </div>
  )
}

// ── Confidence chart ──────────────────────────────────────────────────────────

function ConfidenceChart({
  history,
  chartPair,
}: {
  history: Snapshot[]
  chartPair: string
}) {
  const snapshots = history.slice(-30)
  const labels    = snapshots.map(s => fmtShort(s.timestamp))

  const allPairs = Array.from(
    new Set(history.flatMap(s => s.pairs.map(p => p.pair)))
  ).sort()

  const activePairs = chartPair === "ALL" ? allPairs : [chartPair]

  const datasets: ChartData<"line">["datasets"] = activePairs.map(pair => {
    const color = PAIR_COLORS[pair] ?? "#888"
    const data  = snapshots.map(s => {
      const v = s.pairs.find(p => p.pair === pair)
      return v ? Math.round(v.confidence * 100) : null
    })
    return {
      label: pair,
      data,
      borderColor: color,
      backgroundColor: color + "18",
      pointBackgroundColor: snapshots.map(s => {
        const v = s.pairs.find(p => p.pair === pair)
        if (!v) return color
        return v.signal === "BUY" ? "#22c55e" : v.signal === "SELL" ? "#ef4444" : "#64748b"
      }),
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 1.5,
      tension: 0.35,
      fill: activePairs.length === 1,
      spanGaps: true,
    }
  })

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0d1829",
        borderColor: "#334155",
        borderWidth: 1,
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: "#475569",
          font: { size: 11 },
          callback: v => `${v}%`,
        },
        grid: { color: "#1e293b" },
      },
      x: {
        ticks: {
          color: "#475569",
          font: { size: 10 },
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: { display: false },
      },
    },
  }

  return (
    <div className="rounded-xl border border-[#334155]/40 bg-[#0d1829]/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Confidence over time{chartPair !== "ALL" ? ` — ${chartPair}` : " — all pairs"}
        </p>
        <div className="flex flex-wrap gap-2">
          {activePairs.map(pair => (
            <span key={pair} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: PAIR_COLORS[pair] ?? "#888" }}
              />
              {pair}
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: 220 }}>
        {snapshots.length < 2 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Need at least 2 snapshots to show a chart. Refresh a few times.
          </div>
        ) : (
          <Line data={{ labels, datasets }} options={options} />
        )}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/40">
        Point color: green = BUY · red = SELL · gray = HOLD
      </p>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [history, setHistory]       = useState<Snapshot[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [filter, setFilter]         = useState<"ALL" | "BUY" | "SELL" | "HOLD">("ALL")
  const [pairFilter, setPairFilter] = useState("ALL")
  const [chartPair, setChartPair]   = useState("ALL")

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Snapshot[]
      setHistory(saved)
    } catch {}
  }, [])

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/history")
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? `Error ${res.status}`)
        return
      }
      const snapshot: Snapshot = {
        timestamp:         json.timestamp,
        predictions_count: json.predictions_count,
        errors_count:      json.errors_count,
        pairs:             json.pairs,
      }
      setHistory(prev => {
        const exists  = prev.some(s => s.timestamp === snapshot.timestamp)
        const updated = exists ? prev : [...prev, snapshot].slice(-MAX_SNAPSHOTS)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSignals() }, [fetchSignals])

  const allPairs = Array.from(
    new Set(history.flatMap(s => s.pairs.map(p => p.pair)))
  ).sort()

  const allRows = history
    .slice()
    .reverse()
    .flatMap(s =>
      s.pairs
        .filter(p => filter === "ALL" || p.signal === filter)
        .filter(p => pairFilter === "ALL" || p.pair === pairFilter)
        .map(p => ({ ...p, timestamp: s.timestamp }))
    )

  const totalBuy  = history.flatMap(s => s.pairs).filter(p => p.signal === "BUY"  && !p.gated).length
  const totalSell = history.flatMap(s => s.pairs).filter(p => p.signal === "SELL" && !p.gated).length
  const totalHold = history.flatMap(s => s.pairs).filter(p => p.signal === "HOLD" ||  p.gated).length

  return (
    <div className="min-h-screen bg-[#060d1a] px-4 py-8 text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(56,108,255,0.06),transparent)]" />

      <div className="relative mx-auto max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#334155]/40 bg-[#1e293b]/40">
              <History className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Signal history</h1>
              <p className="text-xs text-muted-foreground">
                {history.length} snapshot{history.length !== 1 ? "s" : ""} stored locally
              </p>
            </div>
          </div>
          <button
            onClick={fetchSignals}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#334155]/60 bg-[#1e293b]/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-[#1e293b]/80 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Fetching…" : "Refresh"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Snapshots",    value: history.length, color: "text-foreground" },
            { label: "Buy signals",  value: totalBuy,       color: "text-green-400"  },
            { label: "Sell signals", value: totalSell,      color: "text-red-400"    },
            { label: "Hold signals", value: totalHold,      color: "text-slate-400"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[#334155]/40 bg-[#1e293b]/40 px-4 py-3">
              <p className="mb-1 text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Confidence growth</p>
            <select
              value={chartPair}
              onChange={e => setChartPair(e.target.value)}
              className="rounded-lg border border-[#334155]/40 bg-[#1e293b]/60 px-2 py-0.5 text-xs text-muted-foreground outline-none"
            >
              <option value="ALL">All pairs</option>
              {allPairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <ConfidenceChart history={history} chartPair={chartPair} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Signal:</span>
          {(["ALL", "BUY", "SELL", "HOLD"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-0.5 text-xs font-medium transition ${
                filter === f
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                  : "border-[#334155]/40 bg-[#1e293b]/40 text-muted-foreground hover:bg-[#1e293b]/80"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-4 text-xs text-muted-foreground">Pair:</span>
          <select
            value={pairFilter}
            onChange={e => setPairFilter(e.target.value)}
            className="rounded-lg border border-[#334155]/40 bg-[#1e293b]/60 px-2 py-0.5 text-xs text-muted-foreground outline-none"
          >
            <option value="ALL">All pairs</option>
            {allPairs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-[#334155]/40 bg-[#0d1829]/60">
          {allRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <History className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {history.length === 0
                  ? "No history yet. Click Refresh to fetch the latest signals."
                  : "No rows match the current filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#334155]/40 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium">Pair</th>
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-left font-medium">Confidence</th>
                    <th className="px-4 py-3 text-left font-medium">Buy</th>
                    <th className="px-4 py-3 text-left font-medium">Hold</th>
                    <th className="px-4 py-3 text-left font-medium">Sell</th>
                    <th className="px-4 py-3 text-left font-medium">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((row, i) => (
                    <tr
                      key={`${row.timestamp}-${row.pair}-${i}`}
                      className="border-b border-[#334155]/20 transition hover:bg-[#1e293b]/30 last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {fmtTime(row.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-300">
                        {row.pair}
                      </td>
                      <td className="px-4 py-3">
                        <SignalBadge signal={row.signal} gated={row.gated} />
                      </td>
                      <td className="px-4 py-3">
                        <ConfBar value={row.confidence} signal={row.signal} />
                      </td>
                      <td className="px-4 py-3 text-xs text-green-400">{pct(row.probs.buy)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{pct(row.probs.hold)}</td>
                      <td className="px-4 py-3 text-xs text-red-400">{pct(row.probs.sell)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50">
          History is stored locally in your browser. Up to {MAX_SNAPSHOTS} snapshots are kept.
        </p>
      </div>
    </div>
  )
}