import React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface KpiCardProps {
  label: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon?: React.ReactNode
  className?: string
}

export function KpiCard({ label, value, change, trend, icon, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-card-foreground">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              {trend === "up" && <TrendingUp className="h-3 w-3 text-accent" />}
              {trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
              {trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
              <span
                className={cn(
                  "text-sm font-medium",
                  trend === "up" && "text-accent",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
