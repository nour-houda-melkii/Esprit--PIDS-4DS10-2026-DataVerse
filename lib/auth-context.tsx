"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

// ─── Types — must match IUser / IPortfolio from user.model.ts ─────────────────

export interface IPortfolio {
  name: string
  currencyPairs: string[]
  initialCapital: number
  currency: string
  riskLevel: "low" | "medium" | "high"
  tradingStyle: "scalping" | "day-trading" | "swing" | "long-term"
  createdAt?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: "investor" | "trader"
  portfolios: IPortfolio[]
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("alphalab-user")
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  // Accepts a full AuthUser object returned from the API
  const login = useCallback(async (userData: AuthUser) => {
    setUser(userData)
    localStorage.setItem("alphalab-user", JSON.stringify(userData))
  }, [])

  // No-op — signup page calls the API itself then calls login()
  const signup = useCallback(async (_name: string, _email: string, _password: string) => {}, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    setUser(null)
    localStorage.removeItem("alphalab-user")
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}