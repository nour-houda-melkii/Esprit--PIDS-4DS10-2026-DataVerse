"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { initialMarketData, type CurrencyPair } from "@/lib/market-data"
import { cn } from "@/lib/utils"

export function MarketTicker() {
  const [marketData, setMarketData] = useState<CurrencyPair[]>(initialMarketData)

  useEffect(() => {
    // Simulate real-time price updates
    const interval = setInterval(() => {
      setMarketData((prev) =>
        prev.map((pair) => {
          const priceChange = (Math.random() - 0.5) * 0.001 * pair.price
          const newPrice = pair.price + priceChange
          const newChange = pair.change + priceChange
          const newChangePercent = (newChange / (newPrice - newChange)) * 100

          return {
            ...pair,
            price: Number(newPrice.toFixed(pair.symbol.includes("JPY") ? 2 : 4)),
            change: Number(newChange.toFixed(4)),
            changePercent: Number(newChangePercent.toFixed(2)),
          }
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-6 overflow-x-auto px-6 py-3 scrollbar-hide">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Live Markets
        </span>
        {marketData.map((pair) => (
          <div
            key={pair.symbol}
            className="flex shrink-0 items-center gap-3 rounded-lg bg-muted/50 px-4 py-2"
          >
            <span className="font-semibold text-foreground">{pair.symbol}</span>
            <span className="font-mono text-sm text-foreground">
              {pair.price.toFixed(pair.symbol.includes("JPY") ? 2 : 4)}
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                pair.changePercent >= 0 ? "text-accent" : "text-destructive"
              )}
            >
              {pair.changePercent >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {pair.changePercent >= 0 ? "+" : ""}
                {pair.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
