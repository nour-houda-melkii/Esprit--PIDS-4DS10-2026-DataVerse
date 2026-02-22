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
  "EUR/GBP","EUR/JPY","GBP/JPY","EUR/CHF","GBP/CHF",
  "CHF/JPY",

]

const RISK_LEVELS  = ["low","medium","high"] as const
const TRADING_STYLES = ["scalping","day-trading","swing","long-term"] as const
const BASE_CURRENCIES = ["USD","EUR","GBP","JPY","CHF"]

const RISK_CONFIG = {
  low:    { label: "Low",    color: "text-emerald-400", bar: "bg-emerald-500", width: "w-1/3",  desc: "Capital preservation first"     },
  medium: { label: "Medium", color: "text-amber-400",   bar: "bg-amber-500",   width: "w-2/3",  desc: "Balanced risk / reward"          },
  high:   { label: "High",   color: "text-red-400",     bar: "bg-red-500",     width: "w-full", desc: "Maximum returns, higher exposure" },
}

const STYLE_CONFIG = {
  scalping:    { label: "Scalping",    sub: "Seconds – minutes",   emoji: "⚡" },
  "day-trading":{ label: "Day Trading", sub: "Minutes – hours",     emoji: "📈" },
  swing:       { label: "Swing",       sub: "Days – weeks",        emoji: "🌊" },
  "long-term": { label: "Long-term",   sub: "Weeks – months",      emoji: "🏔️" },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
                ${done   ? "border-primary bg-primary text-primary-foreground"
                : active ? "border-primary bg-primary/10 text-primary shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                :          "border-[#334155] bg-[#1e293b]/40 text-muted-foreground"}`}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors
                ${active ? "text-primary" : "text-muted-foreground/50"}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`mb-5 h-px w-16 transition-colors duration-500
                ${done ? "bg-primary" : "bg-[#334155]/50"}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
      />
    </div>
  )
}

// ─── Step 1: Account details ──────────────────────────────────────────────────

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
        <h2 className="text-2xl font-black tracking-tight text-foreground">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Join the future of forex intelligence</p>
      </div>

      <InputField label="Full name"   type="text"     placeholder="John Doe"              value={name}     onChange={e => setName(e.target.value)}     />
      <InputField label="Email"       type="email"    placeholder="you@example.com"       value={email}    onChange={e => setEmail(e.target.value)}    />
      <InputField label="Password"    type="password" placeholder="Min. 8 characters"     value={password} onChange={e => setPassword(e.target.value)} />

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      <button onClick={handleNext} className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]">
        Continue
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-primary/80">Sign in</Link>
      </p>
    </div>
  )
}

// ─── Step 2: Role selection ───────────────────────────────────────────────────

function StepRole({ onNext, onBack }: { onNext: (role: "investor" | "trader") => void; onBack: () => void }) {
  const [selected, setSelected] = useState<"investor" | "trader" | null>(null)

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Who are you?</h2>
        <p className="mt-1 text-sm text-muted-foreground">This shapes your entire platform experience</p>
      </div>

      <div className="grid gap-4">
        {/* Investor */}
        <button
          onClick={() => setSelected("investor")}
          className={`relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 active:scale-[0.99]
            ${selected === "investor"
              ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_24px_rgba(16,185,129,0.08)]"
              : "border-[#334155]/50 bg-[#1e293b]/30 hover:border-[#334155]"}`}
        >
          {selected === "investor" && (
            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-3 w-3 text-white" />
            </span>
          )}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="mb-1 text-base font-bold text-foreground">Investor</h3>
          <p className="mb-4 text-sm text-muted-foreground">
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
              ? "border-primary/50 bg-primary/5 shadow-[0_0_24px_rgba(99,102,241,0.08)]"
              : "border-[#334155]/50 bg-[#1e293b]/30 hover:border-[#334155]"}`}
        >
          {selected === "trader" && (
            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Check className="h-3 w-3 text-white" />
            </span>
          )}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-1 text-base font-bold text-foreground">Trader</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Manage up to 5 portfolios with different strategies and currency pairs simultaneously.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Up to 5 portfolios","Multi-strategy","Active signals"].map(t => (
              <span key={t} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">{t}</span>
            ))}
          </div>
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#334155]/60 text-muted-foreground transition-colors hover:border-[#334155] hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          Continue as {selected ?? "..."}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Portfolio editor ─────────────────────────────────────────────────────────

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
    <div className="overflow-hidden rounded-2xl border border-[#334155]/50 bg-[#0a0f1e]/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#334155]/40 bg-[#1e293b]/30 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-[11px] font-black text-primary">
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {portfolio.name || `Portfolio ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-5 p-5">
        {/* Name */}
        <InputField
          label="Portfolio name"
          type="text"
          placeholder='e.g. "Majors Focus"'
          value={portfolio.name}
          onChange={e => onChange({ ...portfolio, name: e.target.value })}
        />

        {/* Currency pairs picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Currency pairs</label>

          {/* Selected tags */}
          {portfolio.currencyPairs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {portfolio.currencyPairs.map(pair => (
                <span key={pair} className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {pair}
                  <button onClick={() => togglePair(pair)} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPairOpen(o => !o)}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40"
            >
              <span>Add pairs…</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${pairOpen ? "rotate-180" : ""}`} />
            </button>

            {pairOpen && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#334155]/60 bg-[#0a0f1e] shadow-xl">
                <div className="border-b border-[#334155]/40 p-2">
                  <input
                    autoFocus
                    placeholder="Search pairs…"
                    value={pairSearch}
                    onChange={e => setPairSearch(e.target.value)}
                    className="w-full rounded-lg bg-[#1e293b]/60 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {filtered.slice(0, 24).map(pair => (
                      <button
                        key={pair}
                        onClick={() => { togglePair(pair); setPairSearch("") }}
                        className="rounded-lg border border-[#334155]/30 bg-[#1e293b]/30 px-2 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      >
                        {pair}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="col-span-3 py-3 text-center text-xs text-muted-foreground">No pairs found</p>
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
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Initial capital</label>
            <input
              type="number"
              min="0"
              placeholder="10,000"
              value={portfolio.initialCapital}
              onChange={e => onChange({ ...portfolio, initialCapital: e.target.value })}
              className="h-12 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Currency</label>
            <select
              value={portfolio.currency}
              onChange={e => onChange({ ...portfolio, currency: e.target.value })}
              className="h-12 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-3 text-sm text-foreground outline-none transition-all focus:border-primary/60"
            >
              {BASE_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Risk level */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Risk level</label>
          <div className="grid grid-cols-3 gap-2">
            {RISK_LEVELS.map(r => {
              const cfg = RISK_CONFIG[r]
              const active = portfolio.riskLevel === r
              return (
                <button
                  key={r}
                  onClick={() => onChange({ ...portfolio, riskLevel: r })}
                  className={`rounded-xl border p-3 text-left transition-all ${active ? `border-current ${cfg.color} bg-current/5` : "border-[#334155]/50 text-muted-foreground hover:border-[#334155]"}`}
                >
                  <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-[#334155]/40">
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
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trading style</label>
          <div className="grid grid-cols-2 gap-2">
            {TRADING_STYLES.map(s => {
              const cfg = STYLE_CONFIG[s]
              const active = portfolio.tradingStyle === s
              return (
                <button
                  key={s}
                  onClick={() => onChange({ ...portfolio, tradingStyle: s })}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? "border-primary/50 bg-primary/5 text-primary" : "border-[#334155]/50 text-muted-foreground hover:border-[#334155] hover:text-foreground"}`}
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

// ─── Step 3: Portfolio setup ──────────────────────────────────────────────────

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
      if (!p.name)            return setError("Each portfolio needs a name.")
      if (!p.initialCapital)  return setError("Each portfolio needs an initial capital.")
      if (p.currencyPairs.length === 0) return setError("Each portfolio needs at least one currency pair.")
    }
    setError("")
    onSubmit(portfolios)
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black tracking-tight text-foreground">
          {role === "investor" ? "Set up your portfolio" : "Set up your portfolios"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
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

        {/* Add portfolio button (traders only) */}
        {role === "trader" && portfolios.length < maxPortfolios && (
          <button
            onClick={addPortfolio}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#334155]/60 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
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
        <button onClick={onBack} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#334155]/60 text-muted-foreground transition-colors hover:border-[#334155] hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
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
  const router   = useRouter()
  const { signup } = useAuth()

  const [step, setStep]           = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError]   = useState("")

  // Collected data
  const [account, setAccount] = useState<{ name: string; email: string; password: string } | null>(null)
  const [role, setRole]       = useState<"investor" | "trader" | null>(null)

  const handleAccountNext = (data: typeof account) => {
    setAccount(data)
    setStep(2)
  }

  const handleRoleNext = (r: "investor" | "trader") => {
    setRole(r)
    setStep(3)
  }

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
          portfolios: portfolios.map(p => ({
            ...p,
            initialCapital: Number(p.initialCapital),
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error ?? "Something went wrong.")
        return
      }

      // Update auth context and redirect
      await signup(account.name, account.email, account.password)
      router.push("/platform/overview")
    } catch {
      setApiError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-16">
      {/* Video background */}
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline>
        <source src="https://res.cloudinary.com/dcfad76uv/video/upload/v1771803408/testsignup_sj8g8k.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Back to home */}
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-[#334155]/50 bg-[#060d1a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
              <span className="text-base font-black text-white">FX</span>
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">AlphaLab</span>
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