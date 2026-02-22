"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  TrendingUp, Shield, Lock, BarChart2, Globe2,
  Calendar, Layers, ChevronRight, Zap, Target,
} from "lucide-react"

const RISK_BAR: Record<string, { width: string; color: string }> = {
  low:    { width: "w-1/3",  color: "bg-emerald-500" },
  medium: { width: "w-2/3",  color: "bg-amber-500"   },
  high:   { width: "w-full", color: "bg-red-500"      },
}

const STYLE_EMOJI: Record<string, string> = {
  scalping:      "⚡",
  "day-trading": "📈",
  swing:         "🌊",
  "long-term":   "🏔️",
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#334155]/40 bg-[#111827]/60 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push("/login")
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  const isTrader     = user.role === "trader"
  const roleColor    = isTrader ? "from-primary to-secondary" : "from-emerald-500 to-teal-500"
  const accentColor  = isTrader ? "text-primary" : "text-emerald-400"
  const borderAccent = isTrader ? "border-primary/30" : "border-emerald-500/30"
  const bgAccent     = isTrader ? "bg-primary/5" : "bg-emerald-500/5"

  const totalCapital = user.portfolios?.reduce(
    (sum: number, p: any) => sum + (Number(p.initialCapital) || 0), 0
  ) ?? 0

  const allPairs = Array.from(
    new Set(user.portfolios?.flatMap((p: any) => p.currencyPairs ?? []) ?? [])
  )

  const joinDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="relative min-h-screen bg-[#060d1a] pb-32 pt-24">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(56,108,255,0.07),transparent)]" />

      <div className="relative mx-auto max-w-3xl px-4">

        {/* ── Hero card ── */}
        <div className={`mb-6 overflow-hidden rounded-3xl border ${borderAccent} ${bgAccent}`}>
          {/* Banner */}
          <div className={`h-24 bg-gradient-to-br ${roleColor} opacity-20`} />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[#060d1a] bg-gradient-to-br ${roleColor} text-3xl font-black text-white shadow-xl`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className={`flex items-center gap-1.5 rounded-full border ${borderAccent} ${bgAccent} px-3 py-1.5`}>
                {isTrader
                  ? <TrendingUp className={`h-3.5 w-3.5 ${accentColor}`} />
                  : <Shield     className={`h-3.5 w-3.5 ${accentColor}`} />}
                <span className={`text-xs font-bold capitalize ${accentColor}`}>{user.role}</span>
              </div>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-foreground">{user.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-[#334155]/50 bg-[#1e293b]/40 px-3 py-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Joined {joinDate}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#334155]/50 bg-[#1e293b]/40 px-3 py-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                {user.portfolios?.length ?? 0} portfolio{(user.portfolios?.length ?? 0) !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-[#334155]/50 bg-[#1e293b]/40 px-3 py-1 text-xs text-muted-foreground">
                <Globe2 className="h-3 w-3" />
                {allPairs.length} currency pair{allPairs.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Portfolios"      value={String(user.portfolios?.length ?? 0)} sub={isTrader ? `of 5 max` : "of 1 max"} />
          <StatCard label="Total Capital"   value={`$${totalCapital.toLocaleString()}`} sub="across all portfolios" />
          <StatCard label="Currency Pairs"  value={String(allPairs.length)} sub="unique pairs tracked" />
          <StatCard label="Agent Signals"   value="--" sub="launching soon" />
        </div>

        {/* ── Currency pairs ── */}
        {allPairs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#334155]/40 bg-[#111827]/60 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe2 className={`h-4 w-4 ${accentColor}`} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Tracked Pairs</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {allPairs.map(pair => (
                <span key={pair} className={`rounded-full border ${borderAccent} ${bgAccent} px-3 py-1 text-xs font-bold ${accentColor}`}>
                  {pair}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Portfolios ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className={`h-4 w-4 ${accentColor}`} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
              {user.portfolios?.length === 1 ? "Portfolio" : "Portfolios"}
            </h2>
          </div>

          {user.portfolios?.map((portfolio: any, i: number) => {
            const risk   = RISK_BAR[portfolio.riskLevel]   ?? RISK_BAR.medium
            const emoji  = STYLE_EMOJI[portfolio.tradingStyle] ?? "📊"
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-[#334155]/40 bg-[#111827]/60"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#334155]/30 bg-[#1e293b]/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${roleColor} text-sm font-black text-white`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{portfolio.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{portfolio.tradingStyle}</p>
                    </div>
                  </div>
                  <span className="text-2xl">{emoji}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                  {/* Capital */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Capital</p>
                    <p className="text-sm font-bold text-foreground">
                      {Number(portfolio.initialCapital).toLocaleString()} {portfolio.currency}
                    </p>
                  </div>

                  {/* Risk */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Risk</p>
                    <p className="mb-1 text-sm font-bold capitalize text-foreground">{portfolio.riskLevel}</p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#334155]/40">
                      <div className={`h-full rounded-full ${risk.color} ${risk.width}`} />
                    </div>
                  </div>

                  {/* Pairs count */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pairs</p>
                    <p className="text-sm font-bold text-foreground">{portfolio.currencyPairs?.length ?? 0}</p>
                  </div>

                  {/* Signal placeholder */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Signal</p>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                      <p className="text-xs text-muted-foreground">Awaiting</p>
                    </div>
                  </div>
                </div>

                {/* Currency pairs */}
                {portfolio.currencyPairs?.length > 0 && (
                  <div className="border-t border-[#334155]/30 px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {portfolio.currencyPairs.map((pair: string) => (
                        <span key={pair} className="rounded-full border border-[#334155]/50 bg-[#1e293b]/40 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Agent preview teaser ── */}
        <div className="mt-6 rounded-2xl border border-[#334155]/40 bg-[#111827]/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">AI Agent Analysis</p>
                <p className="text-xs text-muted-foreground">Personalised signals for your portfolios</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span className="text-xs text-muted-foreground">Coming soon</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {["Sentiment","Technical","Fundamental","Risk","Macro"].map(a => (
              <div key={a} className="rounded-xl border border-[#334155]/40 bg-[#1e293b]/30 p-3 text-center">
                <div className="mx-auto mb-2 h-1.5 w-1.5 rounded-full bg-[#334155]" />
                <p className="text-[10px] font-medium text-muted-foreground/60">{a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}