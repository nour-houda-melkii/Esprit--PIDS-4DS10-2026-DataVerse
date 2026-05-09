"use client"

import Link from "next/link"
import { historicalSignals } from "@/lib/market-data"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"

export function RecentSignalsTable() {
  const recentSignals = historicalSignals.slice(0, 5)

  const getStatusIcon = (status: string, outcome?: string) => {
    if (status === "active") {
      return <Clock className="h-4 w-4 text-secondary" />
    }
    if (status === "expired") {
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
    if (outcome === "profit") {
      return <CheckCircle2 className="h-4 w-4 text-accent" />
    }
    if (outcome === "loss") {
      return <XCircle className="h-4 w-4 text-destructive" />
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg shadow-black/5">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Recent Signals
          </h3>
          <p className="text-sm text-muted-foreground">
            Latest trading signals from the AI agents
          </p>
        </div>
        <Link
          href="/signals"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pair
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Signal
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conviction
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Agents
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentSignals.map((signal) => (
              <tr
                key={signal.id}
                className="transition-colors hover:bg-muted/20"
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {formatTime(signal.timestamp)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-card-foreground">
                  {signal.pair}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      signal.decision === "BUY" &&
                        "bg-accent/10 text-accent",
                      signal.decision === "SELL" &&
                        "bg-destructive/10 text-destructive",
                      signal.decision === "HOLD" &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {signal.decision}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          signal.conviction > 0 ? "bg-accent" : "bg-destructive"
                        )}
                        style={{
                          width: `${Math.abs(signal.conviction)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        signal.conviction > 0
                          ? "text-accent"
                          : "text-destructive"
                      )}
                    >
                      {signal.conviction > 0 ? "+" : ""}
                      {signal.conviction}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {signal.agents.length} agents
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(signal.status, signal.outcome)}
                    <span className="text-sm capitalize text-muted-foreground">
                      {signal.outcome || signal.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
