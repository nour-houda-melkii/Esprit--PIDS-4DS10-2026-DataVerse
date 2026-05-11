"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SignalCardProps {
  pair: string
  initialConviction: number
}

export function SignalCard({ pair, initialConviction }: SignalCardProps) {
  const [conviction, setConviction] = useState(initialConviction)

  useEffect(() => {
    // Simulate conviction score changes
    const interval = setInterval(() => {
      setConviction((prev) => {
        const change = (Math.random() - 0.5) * 10
        const newValue = Math.max(-100, Math.min(100, prev + change))
        return Math.round(newValue)
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getDecision = (score: number) => {
    if (score > 25) return "BUY"
    if (score < -25) return "SELL"
    return "HOLD"
  }

  const decision = getDecision(conviction)

  const getDecisionColor = (dec: string) => {
    switch (dec) {
      case "BUY":
        return "text-accent bg-accent/10 border-accent/30"
      case "SELL":
        return "text-destructive bg-destructive/10 border-destructive/30"
      default:
        return "text-muted-foreground bg-muted/50 border-border"
    }
  }

  const getMeterColor = (score: number) => {
    if (score > 50) return "bg-accent"
    if (score > 25) return "bg-accent/70"
    if (score < -50) return "bg-destructive"
    if (score < -25) return "bg-destructive/70"
    return "bg-muted-foreground"
  }

  // Calculate meter position (0 = left/-100, 100 = right/+100, 50 = center/0)
  const meterPosition = ((conviction + 100) / 200) * 100

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Current Signal</p>
          <p className="mt-1 text-3xl font-bold text-card-foreground">{pair}</p>
        </div>
        <div
          className={cn(
            "rounded-lg border px-4 py-2 text-lg font-bold",
            getDecisionColor(decision)
          )}
        >
          {decision}
        </div>
      </div>

      {/* Conviction Meter */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Conviction Score</span>
          <span
            className={cn(
              "font-bold",
              conviction > 0 ? "text-accent" : conviction < 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {conviction > 0 ? "+" : ""}
            {conviction}
          </span>
        </div>

        {/* Visual meter */}
        <div className="relative mt-3">
          {/* Background track */}
          <div className="h-3 rounded-full bg-muted">
            {/* Gradient overlay */}
            <div className="absolute inset-0 flex h-3 overflow-hidden rounded-full">
              <div className="h-full w-1/2 bg-gradient-to-r from-destructive/60 via-destructive/30 to-transparent" />
              <div className="h-full w-1/2 bg-gradient-to-l from-accent/60 via-accent/30 to-transparent" />
            </div>
          </div>

          {/* Center line */}
          <div className="absolute left-1/2 top-0 h-3 w-0.5 -translate-x-1/2 bg-border" />

          {/* Indicator */}
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-lg transition-all duration-500"
            style={{ left: `${meterPosition}%` }}
          >
            <div className={cn("h-full w-full rounded-full", getMeterColor(conviction))} />
          </div>
        </div>

        {/* Labels */}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>-100 (Strong Sell)</span>
          <span>0</span>
          <span>+100 (Strong Buy)</span>
        </div>
      </div>

      {/* Agent consensus */}
      <div className="mt-6 rounded-lg bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">Agent Consensus</p>
        <p className="mt-1 text-sm text-card-foreground">
          4/5 agents agree on this signal. High confidence level.
        </p>
      </div>
    </div>
  )
}
