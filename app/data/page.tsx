"use client"

import { useEffect, useState } from "react"
import { dataSources, type DataSource } from "@/lib/market-data"
import { cn } from "@/lib/utils"
import {
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Activity,
  Zap,
  Clock,
  Server,
} from "lucide-react"

export default function DataPipelinePage() {
  const [sources, setSources] = useState<DataSource[]>(dataSources)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulate periodic updates to record counts
  useEffect(() => {
    const interval = setInterval(() => {
      setSources((prev) =>
        prev.map((source) => ({
          ...source,
          recordsProcessed:
            source.status === "connected"
              ? source.recordsProcessed + Math.floor(Math.random() * 100)
              : source.recordsProcessed,
          lastUpdate:
            source.status === "connected" && source.type === "stream"
              ? "Just now"
              : source.lastUpdate,
        }))
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000)
  }

  const connectedCount = sources.filter((s) => s.status === "connected").length
  const totalRecords = sources.reduce((acc, s) => acc + s.recordsProcessed, 0)
  const avgLatency = Math.round(
    sources
      .filter((s) => s.status === "connected" && s.latency !== "N/A")
      .reduce((acc, s) => acc + Number.parseInt(s.latency), 0) /
      sources.filter((s) => s.status === "connected" && s.latency !== "N/A")
        .length
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-accent" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-destructive" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "stream":
        return <Activity className="h-4 w-4" />
      case "api":
        return <Zap className="h-4 w-4" />
      case "batch":
        return <Clock className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor data sources and pipeline health for the AI trading system
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
            isRefreshing && "cursor-not-allowed"
          )}
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Server className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connected Sources</p>
              <p className="text-2xl font-bold text-card-foreground">
                {connectedCount}/{sources.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Records Processed</p>
              <p className="text-2xl font-bold text-card-foreground">
                {formatNumber(totalRecords)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <Zap className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold text-card-foreground">
                {avgLatency}ms
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-card-foreground">
                {sources.filter((s) => s.status === "error").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        <h3 className="text-lg font-semibold text-card-foreground">
          Pipeline Flow
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Data flows from sources through processing to AI agents
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {/* Data Sources */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-medium text-card-foreground">
              Data Sources
            </span>
            <span className="text-xs text-muted-foreground">
              {sources.length} configured
            </span>
          </div>

          {/* Arrow */}
          <div className="h-0.5 w-16 shrink-0 bg-gradient-to-r from-primary to-secondary" />

          {/* Ingestion */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary/10">
              <Activity className="h-8 w-8 text-secondary" />
            </div>
            <span className="text-sm font-medium text-card-foreground">
              Ingestion Layer
            </span>
            <span className="text-xs text-accent">Processing</span>
          </div>

          {/* Arrow */}
          <div className="h-0.5 w-16 shrink-0 bg-gradient-to-r from-secondary to-accent" />

          {/* Processing */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <span className="text-sm font-medium text-card-foreground">
              Processing
            </span>
            <span className="text-xs text-accent">
              {formatNumber(totalRecords)}/s
            </span>
          </div>

          {/* Arrow */}
          <div className="h-0.5 w-16 shrink-0 bg-gradient-to-r from-accent to-primary" />

          {/* AI Agents */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-medium text-card-foreground">
              AI Agents
            </span>
            <span className="text-xs text-accent">5 active</span>
          </div>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="rounded-xl border border-border bg-card shadow-lg shadow-black/5">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-card-foreground">
            Data Sources
          </h3>
          <p className="text-sm text-muted-foreground">
            All configured data sources and their current status
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Source
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Latency
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Update
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Records Processed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                        {getTypeIcon(source.type)}
                      </div>
                      <span className="font-medium text-card-foreground">
                        {source.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        source.type === "stream" &&
                          "bg-accent/10 text-accent",
                        source.type === "api" &&
                          "bg-secondary/10 text-secondary",
                        source.type === "batch" &&
                          "bg-primary/10 text-primary"
                      )}
                    >
                      {source.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(source.status)}
                      <span
                        className={cn(
                          "text-sm capitalize",
                          source.status === "connected" && "text-accent",
                          source.status === "disconnected" &&
                            "text-muted-foreground",
                          source.status === "error" && "text-destructive"
                        )}
                      >
                        {source.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "text-sm font-mono",
                        source.latency === "N/A"
                          ? "text-muted-foreground"
                          : "text-card-foreground"
                      )}
                    >
                      {source.latency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {source.lastUpdate}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-card-foreground">
                    {formatNumber(source.recordsProcessed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Note */}
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">
          {/* PLACEHOLDER: Real API integration would connect to your actual data pipeline monitoring system */}
          <span className="font-medium text-card-foreground">Note:</span> This
          page displays simulated pipeline data. In production, connect to your
          data pipeline monitoring system (e.g., Apache Kafka, AWS Kinesis, or
          custom APIs) for real-time status.
        </p>
      </div>
    </div>
  )
}
