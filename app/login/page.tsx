"use client"

import React, { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Loader2, Eye, EyeOff, TrendingUp } from "lucide-react"

function LoginForm() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState("")

  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/platform/overview"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // 1. Call the real login API — sets the HTTP-only auth cookie
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Invalid email or password.")
        return
      }

      // 2. Update the client-side auth context with the returned user
      await login(data.user)

      // 3. Redirect back to where they came from (or overview)
      router.push(from)
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay loop muted playsInline
      >
        <source src="https://res.cloudinary.com/dcfad76uv/video/upload/v1771803517/testlogin_dceikd.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-[#334155]/50 bg-[#060d1a]/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">

          {/* Logo */}
          <div className="mb-10 flex items-center justify-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
              <span className="text-base font-black text-white">FX</span>
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">AlphaLab</span>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to access your trading platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Password
                </label>
                <Link href="#" className="text-xs text-primary/70 transition-colors hover:text-primary">
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
                  className="h-12 w-full rounded-xl border border-[#334155]/60 bg-[#0a0f1e]/60 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
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
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]"
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
            <div className="h-px flex-1 bg-[#334155]/40" />
            <span className="text-xs text-muted-foreground/50">or</span>
            <div className="h-px flex-1 bg-[#334155]/40" />
          </div>

          {/* Sign up CTA */}
          <div className="rounded-2xl border border-[#334155]/30 bg-[#1e293b]/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?
            </p>
            <Link
              href="/signup"
              className="mt-1 inline-block text-sm font-bold text-primary transition-colors hover:text-primary/80"
            >
              Create your AlphaLab account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense because useSearchParams() needs it in Next.js 14+
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}