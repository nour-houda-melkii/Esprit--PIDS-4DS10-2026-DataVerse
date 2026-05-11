"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { FloatingNavbar } from "@/components/floating-navbar"
import { useAuth } from "@/lib/auth-context"

import {
  Wallet,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Shield,
  Mail,
  Crown,
  Sparkles,
  BarChart3,
  Flame,
} from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()

  const {
    user,
    isAuthenticated,
  } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user)
    return null

  const portfolio =
    user.portfolios?.[0]

  return (
    <div className="min-h-screen overflow-hidden bg-[#020617] text-white">

      {/* NAVBAR */}

      <FloatingNavbar />

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-[-10%] top-[-10%] h-[350px] w-[350px] rounded-full bg-yellow-500/10 blur-[100px]" />

        <div className="absolute bottom-[-10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-blue-500/10 blur-[100px]" />

      </div>

      {/* MAIN */}

<main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-20">        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

          

            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Trading Profile
            </h1>

          </div>

          {/* STATUS */}

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">

            <div className="relative flex h-2 w-2">

              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
              Live Session
            </span>
          </div>
        </div>

        {/* HERO */}

        <section className="relative mt-4 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-6">

          {/* EFFECTS */}

          <div className="absolute right-[-120px] top-[-120px] h-[250px] w-[250px] rounded-full bg-yellow-500/10 blur-[100px]" />

          <div className="absolute bottom-[-120px] left-[-120px] h-[250px] w-[250px] rounded-full bg-blue-500/10 blur-[100px]" />

          {/* TOP */}

          <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">

            {/* USER */}

            <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center">

              {/* AVATAR */}

              <div className="relative shrink-0">

                <div className="absolute inset-0 rounded-full bg-yellow-500 blur-3xl opacity-20" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-yellow-500/20 bg-gradient-to-br from-yellow-300 to-yellow-500 text-4xl font-black text-black shadow-[0_0_50px_rgba(250,204,21,0.35)]">
                  {user.name?.charAt(0)}
                </div>

                <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#020617] bg-emerald-400" />
              </div>

              {/* INFO */}

              <div className="min-w-0">

                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2">

                  <Sparkles
                    size={12}
                    className="text-blue-400"
                  />

                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                    Institutional Trader
                  </span>
                </div>

                <h2 className="break-words text-3xl font-black tracking-tight text-white md:text-4xl">
                  {user.name}
                </h2>

                <p className="mt-2 break-all text-sm text-slate-400">
                  {user.email}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">

                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-yellow-400">
                    {user.role}
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-400">
                    FX ALPHALAB
                  </div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-400">
                    HFT
                  </div>
                </div>
              </div>
            </div>

            {/* TOP STATS */}

            <div className="grid w-full max-w-[620px] grid-cols-1 gap-4 lg:grid-cols-2">

              {/* CAPITAL */}

              <div className="group relative flex h-[180px] flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B1220] to-[#081120] p-5 transition duration-300 hover:border-yellow-500/20">

                <div className="absolute right-[-50px] top-[-50px] h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

                <div className="relative z-10 flex items-center justify-between">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
                    <Wallet size={20} />
                  </div>

                  <ArrowUpRight
                    size={16}
                    className="text-emerald-400"
                  />
                </div>

                <div className="relative z-10">

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Portfolio Capital
                  </p>

                  <h3 className="mt-2 text-4xl font-black leading-none text-white">
                    $
                    {portfolio?.initialCapital || 0}
                  </h3>

                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400">

                    <TrendingUp size={13} />

                    +12.45%
                  </div>
                </div>
              </div>

              {/* RISK */}

              <div className="group relative flex h-[180px] flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B1220] to-[#081120] p-5 transition duration-300 hover:border-red-500/20">

                <div className="absolute right-[-50px] top-[-50px] h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />

                <div className="relative z-10 flex items-center justify-between">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <Flame size={20} />
                  </div>

                  <Activity
                    size={16}
                    className="text-red-400"
                  />
                </div>

                <div className="relative z-10">

                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Risk Exposure
                  </p>

                  <h3 className="mt-2 text-4xl font-black capitalize leading-none text-white">
                    {portfolio?.riskLevel || "Low"}
                  </h3>

                  <div className="mt-3 text-xs font-bold text-red-400">
                    Dynamic AI Analysis
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM GRID */}

          <div className="relative z-10 mt-6 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">

            {/* EMAIL */}

            <div className="group flex min-h-[190px] flex-col rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B1220] to-[#081120] p-6 transition duration-300 hover:-translate-y-1 hover:border-yellow-500/20">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-400">
                <Mail size={24} />
              </div>

              <div className="mt-auto">

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Email Address
                </p>

                <h3 className="mt-3 break-all text-lg font-black leading-tight text-white">
                  {user.email}
                </h3>
              </div>
            </div>

            {/* STYLE */}

            <div className="group flex min-h-[190px] flex-col rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B1220] to-[#081120] p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/20">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <BarChart3 size={24} />
              </div>

              <div className="mt-auto">

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Trading Style
                </p>

                <h3 className="mt-3 text-4xl font-black capitalize text-white">
                  {portfolio?.tradingStyle?.replace("-", " ") || "Swing"}
                </h3>
              </div>
            </div>

            {/* PORTFOLIOS */}

            <div className="group flex min-h-[190px] flex-col rounded-[26px] border border-white/10 bg-gradient-to-br from-[#0B1220] to-[#081120] p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-500/20">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <Shield size={24} />
              </div>

              <div className="mt-auto">

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Active Portfolios
                </p>

                <h3 className="mt-3 text-5xl font-black text-white">
                  {user.portfolios?.length}
                </h3>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}