"use client"

import React, { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Loader2, Eye, EyeOff, TrendingUp } from "lucide-react"

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

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [showPass, setShowPass]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState("")

  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/platform/overview"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Invalid email or password."); return }
      await login(data.user)
      router.push(from)
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pt-24 pb-16">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
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

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black tracking-tight text-[#F9EDCC]">Welcome back</h1>
            <p className="mt-1 text-sm text-[#8A6A20]">Sign in to access your trading platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-4 text-sm text-[#F9EDCC] placeholder:text-[#8A6A20]/50 outline-none transition-all focus:border-[#D4A017]/60 focus:ring-1 focus:ring-[#D4A017]/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#8A6A20]">Password</label>
                <Link href="#" className="text-xs text-[#D4A017]/70 transition-colors hover:text-[#D4A017]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-[#D4A017]/20 bg-[#0F0D02]/60 px-4 pr-12 text-sm text-[#F9EDCC] placeholder:text-[#8A6A20]/50 outline-none transition-all focus:border-[#D4A017]/60 focus:ring-1 focus:ring-[#D4A017]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A6A20]/50 transition-colors hover:text-[#8A6A20]"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D4A017] font-semibold text-[#0F0D02] transition-all hover:bg-[#C8920E] disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                <><TrendingUp className="h-4 w-4" /> Sign in</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D4A017]/15" />
            <span className="text-xs text-[#8A6A20]/50">or</span>
            <div className="h-px flex-1 bg-[#D4A017]/15" />
          </div>

          {/* Sign up CTA */}
          <div className="rounded-2xl border border-[#D4A017]/20 bg-[#1C1806]/40 p-4 text-center">
            <p className="text-sm text-[#8A6A20]">Don&apos;t have an account?</p>
            <Link
              href="/signup"
              className="mt-1 inline-block text-sm font-bold text-[#D4A017] transition-colors hover:text-[#C8920E]"
            >
              Create your AlphaLab account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}