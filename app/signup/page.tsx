"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2,
  TrendingUp, Shield, ChevronDown, X,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_PAIRS = [
  "EUR/USD","GBP/USD","USD/JPY","USD/CHF",
  "EUR/JPY","GBP/JPY",
]

const RISK_LEVELS    = ["low","medium","high"] as const
const TRADING_STYLES = ["scalping","day-trading","swing","long-term"] as const
const BASE_CURRENCIES = ["USD","EUR","GBP","JPY","CHF"]

const RISK_CONFIG = {
  low:    { label: "Low",    color: "text-emerald-400", bar: "bg-emerald-500", width: "w-1/3",  desc: "Capital preservation first"      },
  medium: { label: "Medium", color: "text-[#D4A017]",   bar: "bg-[#D4A017]",   width: "w-2/3",  desc: "Balanced risk / reward"           },
  high:   { label: "High",   color: "text-red-400",     bar: "bg-red-500",     width: "w-full", desc: "Maximum returns, higher exposure"  },
}

const STYLE_CONFIG = {
  scalping:      { label: "Scalping",     sub: "Seconds – minutes", emoji: "⚡" },
  "day-trading": { label: "Day Trading",  sub: "Minutes – hours",   emoji: "📈" },
  swing:         { label: "Swing",        sub: "Days – weeks",      emoji: "🌊" },
  "long-term":   { label: "Long-term",    sub: "Weeks – months",    emoji: "🏔️" },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Portfolio {
  name: string
  currencyPairs: string[]
  initialCapital: string
  currency: string
  riskLevel: typeof RISK_LEVELS[number]
  tradingStyle: typeof TRADING_STYLES[number]
}

const emptyPortfolio = (): Portfolio => ({
  name: "", currencyPairs: [], initialCapital: "",
  currency: "USD", riskLevel: "medium", tradingStyle: "swing",
})

function AnimatedBackground() {
  const candles = Array.from({ length: 18 })
  const signals = Array.from({ length: 12 })
  const particles = Array.from({ length: 20 })

  const signalData = [
    { label: "BUY",  icon: "▲", color: "#22A05A", bg: "rgba(34,160,90,0.15)",  border: "rgba(34,160,90,0.5)"  },
    { label: "SELL", icon: "▼", color: "#DC3232", bg: "rgba(220,50,50,0.15)",  border: "rgba(220,50,50,0.5)"  },
    { label: "BUY",  icon: "▲", color: "#22A05A", bg: "rgba(34,160,90,0.15)",  border: "rgba(34,160,90,0.5)"  },
    { label: "SELL", icon: "▼", color: "#DC3232", bg: "rgba(220,50,50,0.15)",  border: "rgba(220,50,50,0.5)"  },
    { label: "HOLD", icon: "◆", color: "#D4A017", bg: "rgba(212,160,23,0.15)", border: "rgba(212,160,23,0.5)" },
    { label: "BUY",  icon: "▲", color: "#22A05A", bg: "rgba(34,160,90,0.15)",  border: "rgba(34,160,90,0.5)"  },
    { label: "SELL", icon: "▼", color: "#DC3232", bg: "rgba(220,50,50,0.15)",  border: "rgba(220,50,50,0.5)"  },
    { label: "BUY",  icon: "▲", color: "#22A05A", bg: "rgba(34,160,90,0.15)",  border: "rgba(34,160,90,0.5)"  },
    { label: "HOLD", icon: "◆", color: "#D4A017", bg: "rgba(212,160,23,0.15)", border: "rgba(212,160,23,0.5)" },
    { label: "SELL", icon: "▼", color: "#DC3232", bg: "rgba(220,50,50,0.15)",  border: "rgba(220,50,50,0.5)"  },
    { label: "BUY",  icon: "▲", color: "#22A05A", bg: "rgba(34,160,90,0.15)",  border: "rgba(34,160,90,0.5)"  },
    { label: "SELL", icon: "▼", color: "#DC3232", bg: "rgba(220,50,50,0.15)",  border: "rgba(220,50,50,0.5)"  },
  ]

  // Precomputed movement vectors so each signal drifts differently
  const movements = [
    { sx: "5%",  sy: "10%", dx: "120px",  dy: "-180px", mx: "60px",  my: "-90px",  ex: "120px",  ey: "-180px" },
    { sx: "20%", sy: "70%", dx: "-150px", dy: "-200px", mx: "-75px", my: "-100px", ex: "-150px", ey: "-200px" },
    { sx: "40%", sy: "30%", dx: "100px",  dy: "-220px", mx: "50px",  my: "-110px", ex: "100px",  ey: "-220px" },
    { sx: "60%", sy: "80%", dx: "-80px",  dy: "-190px", mx: "-40px", my: "-95px",  ex: "-80px",  ey: "-190px" },
    { sx: "75%", sy: "20%", dx: "90px",   dy: "-160px", mx: "45px",  my: "-80px",  ex: "90px",   ey: "-160px" },
    { sx: "85%", sy: "55%", dx: "-110px", dy: "-210px", mx: "-55px", my: "-105px", ex: "-110px", ey: "-210px" },
    { sx: "15%", sy: "45%", dx: "130px",  dy: "-170px", mx: "65px",  my: "-85px",  ex: "130px",  ey: "-170px" },
    { sx: "50%", sy: "60%", dx: "-90px",  dy: "-230px", mx: "-45px", my: "-115px", ex: "-90px",  ey: "-230px" },
    { sx: "30%", sy: "85%", dx: "140px",  dy: "-150px", mx: "70px",  my: "-75px",  ex: "140px",  ey: "-150px" },
    { sx: "70%", sy: "40%", dx: "-120px", dy: "-200px", mx: "-60px", my: "-100px", ex: "-120px", ey: "-200px" },
    { sx: "90%", sy: "75%", dx: "80px",   dy: "-240px", mx: "40px",  my: "-120px", ex: "80px",   ey: "-240px" },
    { sx: "10%", sy: "25%", dx: "-100px", dy: "-180px", mx: "-50px", my: "-90px",  ex: "-100px", ey: "-180px" },
  ]

  return (
    <>
      {/* Base */}
      <div className="absolute inset-0" style={{ background: "#060a06" }} />

      {/* Green/red orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full" style={{
          top: "-5%", left: "-5%", width: "50%", height: "50%",
          background: "radial-gradient(circle, rgba(34,160,90,0.2) 0%, transparent 70%)",
          filter: "blur(50px)", animation: "orbPulse 5s ease-in-out infinite",
        }} />
        <div className="absolute rounded-full" style={{
          bottom: "-10%", right: "-5%", width: "45%", height: "45%",
          background: "radial-gradient(circle, rgba(220,50,50,0.18) 0%, transparent 70%)",
          filter: "blur(50px)", animation: "orbPulse 6s ease-in-out 2s infinite",
        }} />
        <div className="absolute rounded-full" style={{
          top: "35%", left: "35%", width: "30%", height: "30%",
          background: "radial-gradient(circle, rgba(34,160,90,0.12) 0%, transparent 70%)",
          filter: "blur(40px)", animation: "orbPulse 7s ease-in-out 1s infinite",
        }} />
      </div>

      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(34,160,90,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(34,160,90,0.04) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }} />

      {/* Moving candlesticks */}
      <div className="absolute inset-0 overflow-hidden">
        {candles.map((_, i) => {
          const isGreen = i % 2 === 0
          const color = isGreen ? "rgba(34,160,90,0.75)" : "rgba(220,50,50,0.75)"
          const bodyH = 18 + (i * 13) % 55
          const wickH = bodyH + 8 + (i * 7) % 20
          return (
            <div key={i} style={{
              position: "absolute",
              bottom: `${(i * 8 + 3) % 55}%`,
              left: `${(i * 5.6 + 2) % 97}%`,
              display: "flex", flexDirection: "column", alignItems: "center",
              animation: `floatUp ${5 + (i * 0.7) % 6}s ease-in-out ${(i * 0.9) % 10}s infinite`,
            }}>
              <div style={{ width: "1px", height: `${(wickH - bodyH) / 2}px`, background: color, opacity: 0.5 }} />
              <div style={{ width: "7px", height: `${bodyH}px`, background: color, borderRadius: "1px" }} />
              <div style={{ width: "1px", height: `${(wickH - bodyH) / 2}px`, background: color, opacity: 0.5 }} />
            </div>
          )
        })}
      </div>

      {/* Moving BUY/SELL/HOLD signal badges — fully animated across screen */}
      <div className="absolute inset-0 overflow-hidden">
        {signals.map((_, i) => {
          const s = signalData[i % signalData.length]
          const m = movements[i % movements.length]
          const duration = `${7 + (i * 0.8) % 6}s`
          const delay = `${(i * 1.1) % 9}s`
          return (
            <div key={i} style={{
              position: "absolute",
              left: m.sx,
              top: m.sy,
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              opacity: 0,
              // @ts-ignore
              "--mx": m.mx, "--my": m.my, "--ex": m.ex, "--ey": m.ey,
              animation: `floatRandom ${duration} ease-in-out ${delay} infinite`,
              zIndex: 2,
            }}>
              {/* Signal badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "3px 8px",
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: "4px",
                backdropFilter: "blur(4px)",
              }}>
                <span style={{ fontSize: "9px", color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: s.color }}>
                  {s.label}
                </span>
              </div>
              {/* Glowing dot */}
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: s.color,
                boxShadow: `0 0 10px 3px ${s.color}`,
              }} />
              {/* Connecting line */}
              <div style={{
                width: "1px", height: "16px",
                background: `linear-gradient(to bottom, ${s.color}, transparent)`,
              }} />
            </div>
          )
        })}
      </div>

      {/* Drifting forex pair labels */}
      <div className="absolute inset-0 overflow-hidden">
        {["EUR/USD","GBP/USD","USD/JPY","USD/CHF","EUR/GBP","GBP/JPY","EUR/JPY","AUD/USD"].map((pair, i) => (
          <div key={i} style={{
            position: "absolute",
            left: "-80px",
            top: `${8 + i * 11}%`,
            fontSize: "10px", fontWeight: 600,
            color: i % 2 === 0 ? "rgba(34,160,90,0.5)" : "rgba(220,50,50,0.45)",
            letterSpacing: "0.1em",
            whiteSpace: "nowrap",
            animation: `driftX ${14 + i * 2}s linear ${i * 1.8}s infinite`,
          }}>
            {pair} &nbsp; {i % 2 === 0 ? "▲" : "▼"} &nbsp; {(1.08 + i * 0.12).toFixed(4)}
          </div>
        ))}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            bottom: "-4px",
            left: `${(i * 5.1 + 1) % 99}%`,
            width: i % 3 === 0 ? "3px" : "2px",
            height: i % 3 === 0 ? "3px" : "2px",
            borderRadius: "50%",
            background: i % 2 === 0 ? "#22A05A" : "#DC3232",
            opacity: 0,
            animation: `floatUp ${7 + (i * 0.7) % 7}s linear ${(i * 0.5) % 6}s infinite`,
          }} />
        ))}
      </div>

      {/* Scrolling ticker */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{
        height: "28px",
        borderTop: "1px solid rgba(34,160,90,0.12)",
        background: "rgba(6,10,6,0.85)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", height: "100%",
          animation: "tickerScroll 22s linear infinite",
          whiteSpace: "nowrap", gap: "36px",
        }}>
          {[
            { pair: "EUR/USD", val: "1.0842", up: true  },
            { pair: "GBP/USD", val: "1.2634", up: false },
            { pair: "USD/JPY", val: "149.32", up: true  },
            { pair: "USD/CHF", val: "0.8923", up: false },
            { pair: "EUR/GBP", val: "0.8581", up: true  },
            { pair: "GBP/JPY", val: "188.74", up: true  },
            { pair: "EUR/JPY", val: "161.83", up: false },
            { pair: "AUD/USD", val: "0.6512", up: true  },
            { pair: "EUR/USD", val: "1.0842", up: true  },
            { pair: "GBP/USD", val: "1.2634", up: false },
            { pair: "USD/JPY", val: "149.32", up: true  },
            { pair: "USD/CHF", val: "0.8923", up: false },
          ].map((item, i) => (
            <span key={i} style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em",
              color: item.up ? "#22A05A" : "#DC3232",
              display: "inline-flex", alignItems: "center", gap: "5px",
            }}>
              <span style={{ color: "rgba(249,237,204,0.4)" }}>{item.pair}</span>
              {item.val}
              <span>{item.up ? "▲" : "▼"}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 15%, rgba(6,10,6,0.88) 100%)",
      }} />
    </>
  )
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ["Account", "Role", "Portfolio"]
  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {Array.from({ length: total }).map((_, i) => {
        const done   = i + 1 < step
        const active = i + 1 === step
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300
                ${done   ? "border-[#D4A017] bg-[#D4A017] text-[#0F0D02]"
                : active ? "border-[#D4A017] bg-[#D4A017]/10 text-[#D4A017] shadow-[0_0_16px_rgba(212,160,23,0.25)]"
                :          "border-[#2E280A] bg-[#1C1806]/40 text-[#8A6A20]"}`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors
                ${active ? "text-[#D4A017]" : "text-[#8A6A20]/50"}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`mb-5 h-px w-16 transition-colors duration-500
                ${done ? "bg-[#D4A017]" : "bg-[#2E280A]/50"}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Input Field ──────────────────────────────────────────────────────────────

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">{label}</label>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-4 text-sm text-[#F9EDCC] placeholder:text-[#8A6A20]/40 outline-none transition-all focus:border-[#D4A017]/60 focus:ring-1 focus:ring-[#D4A017]/20"
      />
    </div>
  )
}

// ─── Step 1: Account ──────────────────────────────────────────────────────────

function StepAccount({ onNext }: { onNext: (data: { name: string; email: string; password: string }) => void }) {
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")

  const handleNext = () => {
    if (!name || !email || !password) return setError("All fields are required.")
    if (password.length < 8)          return setError("Password must be at least 8 characters.")
    setError("")
    onNext({ name, email, password })
  }

  return (
    <div className="space-y-5">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#F9EDCC]">Create your account</h2>
        <p className="mt-1 text-sm text-[#8A6A20]">Join the future of forex intelligence</p>
      </div>

      <InputField label="Full name" type="text"     placeholder="John Doe"         value={name}     onChange={e => setName(e.target.value)}     />
      <InputField label="Email"     type="email"    placeholder="you@example.com"  value={email}    onChange={e => setEmail(e.target.value)}    />
      <InputField label="Password"  type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleNext}
        className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D4A017] font-semibold text-[#0F0D02] transition-all hover:bg-[#C8920E] active:scale-[0.98]"
      >
        Continue
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="text-center text-sm text-[#8A6A20]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#D4A017] hover:text-[#C8920E]">Sign in</Link>
      </p>
    </div>
  )
}

// ─── Step 2: Role ─────────────────────────────────────────────────────────────

function StepRole({ onNext, onBack }: { onNext: (role: "investor" | "trader") => void; onBack: () => void }) {
  const [selected, setSelected] = useState<"investor" | "trader" | null>(null)

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#F9EDCC]">Who are you?</h2>
        <p className="mt-1 text-sm text-[#8A6A20]">This shapes your entire platform experience</p>
      </div>

      <div className="grid gap-4">
        {/* Investor */}
        <button
          onClick={() => setSelected("investor")}
          className={`relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 active:scale-[0.99]
            ${selected === "investor"
              ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_24px_rgba(16,185,129,0.08)]"
              : "border-[#2E280A]/80 bg-[#1C1806]/30 hover:border-[#D4A017]/20"}`}
        >
          {selected === "investor" && (
            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-3 w-3 text-white" />
            </span>
          )}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="mb-1 text-base font-bold text-[#F9EDCC]">Investor</h3>
          <p className="mb-4 text-sm text-[#8A6A20]">
            Steady growth with a single, focused portfolio. Ideal for long-term wealth building.
          </p>
          <div className="flex flex-wrap gap-2">
            {["1 portfolio","Long-term focus","Capital preservation"].map(t => (
              <span key={t} className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">{t}</span>
            ))}
          </div>
        </button>

        {/* Trader */}
        <button
          onClick={() => setSelected("trader")}
          className={`relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 active:scale-[0.99]
            ${selected === "trader"
              ? "border-[#D4A017]/50 bg-[#D4A017]/5 shadow-[0_0_24px_rgba(212,160,23,0.08)]"
              : "border-[#2E280A]/80 bg-[#1C1806]/30 hover:border-[#D4A017]/20"}`}
        >
          {selected === "trader" && (
            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4A017]">
              <Check className="h-3 w-3 text-[#0F0D02]" />
            </span>
          )}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A017]/10">
            <TrendingUp className="h-6 w-6 text-[#D4A017]" />
          </div>
          <h3 className="mb-1 text-base font-bold text-[#F9EDCC]">Trader</h3>
          <p className="mb-4 text-sm text-[#8A6A20]">
            Manage up to 5 portfolios with different strategies and currency pairs simultaneously.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Up to 5 portfolios","Multi-strategy","Active signals"].map(t => (
              <span key={t} className="rounded-full border border-[#D4A017]/20 bg-[#D4A017]/5 px-2.5 py-0.5 text-[11px] font-medium text-[#D4A017]">{t}</span>
            ))}
          </div>
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2E280A]/80 text-[#8A6A20] transition-colors hover:border-[#D4A017]/30 hover:text-[#D4A017]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4A017] font-semibold text-[#0F0D02] transition-all hover:bg-[#C8920E] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          Continue as {selected ?? "..."}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Portfolio Editor ─────────────────────────────────────────────────────────

function PortfolioEditor({
  portfolio, index, onChange, onRemove, canRemove,
}: {
  portfolio: Portfolio
  index: number
  onChange: (p: Portfolio) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [pairSearch, setPairSearch] = useState("")
  const [pairOpen, setPairOpen]     = useState(false)

  const filtered = CURRENCY_PAIRS.filter(
    p => p.toLowerCase().includes(pairSearch.toLowerCase()) && !portfolio.currencyPairs.includes(p)
  )

  const togglePair = (pair: string) => {
    const next = portfolio.currencyPairs.includes(pair)
      ? portfolio.currencyPairs.filter(p => p !== pair)
      : [...portfolio.currencyPairs, pair]
    onChange({ ...portfolio, currencyPairs: next })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D4A017]/15 bg-[#0F0D02]/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D4A017]/10 bg-[#1C1806]/40 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D4A017]/20 text-[11px] font-black text-[#D4A017]">
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-[#F9EDCC]">
            {portfolio.name || `Portfolio ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="rounded-lg p-1.5 text-[#8A6A20]/50 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-5 p-5">
        <InputField
          label="Portfolio name"
          type="text"
          placeholder='e.g. "Majors Focus"'
          value={portfolio.name}
          onChange={e => onChange({ ...portfolio, name: e.target.value })}
        />

        {/* Currency pairs picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Currency pairs</label>

          {portfolio.currencyPairs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {portfolio.currencyPairs.map(pair => (
                <span key={pair} className="flex items-center gap-1 rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-2.5 py-1 text-[11px] font-bold text-[#D4A017]">
                  {pair}
                  <button onClick={() => togglePair(pair)} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setPairOpen(o => !o)}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-4 text-sm text-[#8A6A20] transition-colors hover:border-[#D4A017]/40"
            >
              <span>Add pairs…</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${pairOpen ? "rotate-180" : ""}`} />
            </button>

            {pairOpen && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#D4A017]/20 bg-[#0F0D02] shadow-xl">
                <div className="border-b border-[#D4A017]/10 p-2">
                  <input
                    autoFocus
                    placeholder="Search pairs…"
                    value={pairSearch}
                    onChange={e => setPairSearch(e.target.value)}
                    className="w-full rounded-lg bg-[#1C1806]/60 px-3 py-1.5 text-sm text-[#F9EDCC] placeholder:text-[#8A6A20]/50 outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {filtered.slice(0, 24).map(pair => (
                      <button
                        key={pair}
                        onClick={() => { togglePair(pair); setPairSearch("") }}
                        className="rounded-lg border border-[#2E280A]/50 bg-[#1C1806]/30 px-2 py-1.5 text-[11px] font-bold text-[#8A6A20] transition-colors hover:border-[#D4A017]/40 hover:bg-[#D4A017]/10 hover:text-[#D4A017]"
                      >
                        {pair}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="col-span-3 py-3 text-center text-xs text-[#8A6A20]">No pairs found</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Capital + currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Initial capital</label>
            <input
              type="number"
              min="0"
              placeholder="10,000"
              value={portfolio.initialCapital}
              onChange={e => onChange({ ...portfolio, initialCapital: e.target.value })}
              className="h-12 w-full rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-4 text-sm text-[#F9EDCC] placeholder:text-[#8A6A20]/40 outline-none transition-all focus:border-[#D4A017]/60 focus:ring-1 focus:ring-[#D4A017]/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Currency</label>
            <select
              value={portfolio.currency}
              onChange={e => onChange({ ...portfolio, currency: e.target.value })}
              className="h-12 w-full rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-3 text-sm text-[#F9EDCC] outline-none transition-all focus:border-[#D4A017]/60"
            >
              {BASE_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Risk level */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Risk level</label>
          <div className="grid grid-cols-3 gap-2">
            {RISK_LEVELS.map(r => {
              const cfg = RISK_CONFIG[r]
              const active = portfolio.riskLevel === r
              return (
                <button
                  key={r}
                  onClick={() => onChange({ ...portfolio, riskLevel: r })}
                  className={`rounded-xl border p-3 text-left transition-all
                    ${active
                      ? `border-current ${cfg.color} bg-current/5`
                      : "border-[#2E280A]/60 text-[#8A6A20] hover:border-[#D4A017]/20"}`}
                >
                  <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-[#2E280A]/60">
                    <div className={`h-full rounded-full ${cfg.bar} ${cfg.width}`} />
                  </div>
                  <p className={`text-xs font-bold ${active ? cfg.color : ""}`}>{cfg.label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight opacity-70">{cfg.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Trading style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Trading style</label>
          <div className="grid grid-cols-2 gap-2">
            {TRADING_STYLES.map(s => {
              const cfg = STYLE_CONFIG[s]
              const active = portfolio.tradingStyle === s
              return (
                <button
                  key={s}
                  onClick={() => onChange({ ...portfolio, tradingStyle: s })}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all
                    ${active
                      ? "border-[#D4A017]/50 bg-[#D4A017]/5 text-[#D4A017]"
                      : "border-[#2E280A]/60 text-[#8A6A20] hover:border-[#D4A017]/20 hover:text-[#F9EDCC]"}`}
                >
                  <span className="text-xl">{cfg.emoji}</span>
                  <div>
                    <p className="text-xs font-bold">{cfg.label}</p>
                    <p className="text-[10px] opacity-60">{cfg.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Portfolios ───────────────────────────────────────────────────────

function StepPortfolios({
  role, onBack, onSubmit, isLoading,
}: {
  role: "investor" | "trader"
  onBack: () => void
  onSubmit: (portfolios: Portfolio[]) => void
  isLoading: boolean
}) {
  const maxPortfolios = role === "investor" ? 1 : 5
  const [portfolios, setPortfolios] = useState<Portfolio[]>([emptyPortfolio()])
  const [error, setError] = useState("")

  const update = (i: number, p: Portfolio) =>
    setPortfolios(prev => prev.map((old, idx) => idx === i ? p : old))

  const addPortfolio = () => {
    if (portfolios.length < maxPortfolios)
      setPortfolios(prev => [...prev, emptyPortfolio()])
  }

  const removePortfolio = (i: number) =>
    setPortfolios(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = () => {
    for (const p of portfolios) {
      if (!p.name)                      return setError("Each portfolio needs a name.")
      if (!p.initialCapital)            return setError("Each portfolio needs an initial capital.")
      if (p.currencyPairs.length === 0) return setError("Each portfolio needs at least one currency pair.")
    }
    setError("")
    onSubmit(portfolios)
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#F9EDCC]">
          {role === "investor" ? "Set up your portfolio" : "Set up your portfolios"}
        </h2>
        <p className="mt-1 text-sm text-[#8A6A20]">
          {role === "investor"
            ? "Configure your single investment portfolio"
            : `You can add up to ${maxPortfolios} portfolios`}
        </p>
      </div>

      <div className="space-y-4">
        {portfolios.map((p, i) => (
          <PortfolioEditor
            key={i}
            portfolio={p}
            index={i}
            onChange={p => update(i, p)}
            onRemove={() => removePortfolio(i)}
            canRemove={portfolios.length > 1}
          />
        ))}

        {role === "trader" && portfolios.length < maxPortfolios && (
          <button
            onClick={addPortfolio}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D4A017]/20 text-sm text-[#8A6A20] transition-colors hover:border-[#D4A017]/40 hover:text-[#D4A017]"
          >
            <Plus className="h-4 w-4" />
            Add another portfolio ({portfolios.length}/{maxPortfolios})
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2E280A]/80 text-[#8A6A20] transition-colors hover:border-[#D4A017]/30 hover:text-[#D4A017]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4A017] font-semibold text-[#0F0D02] transition-all hover:bg-[#C8920E] disabled:opacity-50 active:scale-[0.98]"
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
          ) : (
            <><Check className="h-4 w-4" /> Launch my platform</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router     = useRouter()
  const { signup } = useAuth()

  const [step, setStep]           = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError]   = useState("")

  const [account, setAccount] = useState<{ name: string; email: string; password: string } | null>(null)
  const [role, setRole]       = useState<"investor" | "trader" | null>(null)

  const handleAccountNext = (data: typeof account) => { setAccount(data); setStep(2) }
  const handleRoleNext    = (r: "investor" | "trader") => { setRole(r); setStep(3) }

  const handleSubmit = async (portfolios: any[]) => {
    if (!account || !role) return
    setIsLoading(true)
    setApiError("")
    try {
      const res = await fetch("/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:       account.name,
          email:      account.email,
          password:   account.password,
          role,
          portfolios: portfolios.map(p => ({ ...p, initialCapital: Number(p.initialCapital) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error ?? "Something went wrong."); return }
      await signup(account.name, account.email, account.password)
      router.push("/platform/overview")
    } catch {
      setApiError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pt-24 pb-16">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-lg">
        {/* Back to home */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#8A6A20] transition-colors hover:text-[#D4A017]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-[#D4A017]/25 bg-[#141104]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">

          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <img
              src="/logo.png"
              alt="FX-AlphaLab"
              className="h-20 w-20 rounded-full border-2 border-[#D4A017] object-cover"
            />
            <span className="text-lg font-black tracking-widest text-[#F9EDCC]">
              <span className="text-[#D4A017]">FX-</span>ALPHALAB
            </span>
          </div>

          <StepIndicator step={step} total={3} />

          {apiError && (
            <div className="mb-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
              {apiError}
            </div>
          )}

          {step === 1 && <StepAccount onNext={handleAccountNext} />}
          {step === 2 && <StepRole onNext={handleRoleNext} onBack={() => setStep(1)} />}
          {step === 3 && role && (
            <StepPortfolios
              role={role}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}