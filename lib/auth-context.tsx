"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"

export interface IPortfolio {
  name: string
  currencyPairs: string[]
  initialCapital: number
  currency: string
  riskLevel: "low" | "medium" | "high"
  tradingStyle:
    | "scalping"
    | "day-trading"
    | "swing"
    | "long-term"
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
  setUser: React.Dispatch<
    React.SetStateAction<AuthUser | null>
  >
  loading: boolean
  isAuthenticated: boolean
  login: (user: AuthUser) => Promise<void>
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext =
  createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("alphalab-user")

      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(
    async (userData: AuthUser) => {
      setUser(userData)

      localStorage.setItem(
        "alphalab-user",
        JSON.stringify(userData)
      )
    },
    []
  )

  const signup = useCallback(
    async (
      _name: string,
      _email: string,
      _password: string
    ) => {},
    []
  )

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
    } catch (error) {
      console.error(error)
    }

    setUser(null)
    localStorage.removeItem("alphalab-user")
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    )
  }

  return ctx
}