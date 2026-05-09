import { notFound } from "next/navigation"
import Link from "next/link"
import { getAgentById, agents } from "@/lib/agents"
import { cn } from "@/lib/utils"
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { AgentPerformanceChart } from "@/components/agent-performance-chart"

export function generateStaticParams() {
  return agents.map((agent) => ({ agentId: agent.id }))
}

interface AgentDetailPageProps {
  params: Promise<{ agentId: string }>
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params
  const agent = getAgentById(agentId)

  if (!agent) notFound()

  // Safe fallbacks so .map() never runs on undefined
  const kpis           = agent.kpis           ?? []
  const recentAnalysis = agent.recentAnalysis  ?? []
  const capabilities   = agent.capabilities    ?? []
  const accuracy       = agent.accuracy        ?? 0
  const responseTime   = agent.responseTime    ?? "N/A"
  const status         = agent.status          ?? "offline"
  const lastUpdated    = agent.lastUpdated      ?? "Unknown"

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="flex items-start gap-6">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${agent.color}20` }}
        >
          <agent.icon className="h-10 w-10" style={{ color: agent.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{agent.name}</h1>
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1",
                status === "online"     && "bg-accent/10 text-accent",
                status === "offline"    && "bg-destructive/10 text-destructive",
                status === "processing" && "bg-secondary/10 text-secondary"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "online"     && "bg-accent",
                  status === "offline"    && "bg-destructive",
                  status === "processing" && "bg-secondary animate-pulse"
                )}
              />
              <span className="text-sm font-medium capitalize">{status}</span>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">{agent.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5"
            >
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold text-card-foreground">{kpi.value}</p>
              {kpi.change && (
                <div className="mt-2 flex items-center gap-1">
                  {kpi.trend === "up"      && <TrendingUp   className="h-3 w-3 text-accent"          />}
                  {kpi.trend === "down"    && <TrendingDown  className="h-3 w-3 text-destructive"     />}
                  {kpi.trend === "neutral" && <Minus         className="h-3 w-3 text-muted-foreground"/>}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      kpi.trend === "up"      && "text-accent",
                      kpi.trend === "down"    && "text-destructive",
                      kpi.trend === "neutral" && "text-muted-foreground"
                    )}
                  >
                    {kpi.change}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <AgentPerformanceChart agentColor={agent.color} agentName={agent.name} />
        </div>

        {/* Recent Analysis */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
          <h3 className="text-lg font-semibold text-card-foreground">Recent Analysis</h3>
          <p className="mt-1 text-sm text-muted-foreground">Latest insights from this agent</p>
          <div className="mt-4 space-y-3">
            {recentAnalysis.length > 0 ? recentAnalysis.map((analysis, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <p className="text-sm text-card-foreground">{analysis}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {index === 0 ? "Just now" : index === 1 ? "5 min ago" : index === 2 ? "15 min ago" : "30 min ago"}
                </p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No recent analysis available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Accuracy Metrics */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        <h3 className="text-lg font-semibold text-card-foreground">Accuracy Metrics by Timeframe</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Historical accuracy across different market conditions
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "1 Hour",   value: accuracy - 3 },
            { label: "4 Hours",  value: accuracy     },
            { label: "Daily",    value: accuracy + 2 },
            { label: "Weekly",   value: accuracy + 5 },
          ].map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="relative mx-auto h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="3" className="text-muted"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={agent.color} strokeWidth="3"
                    strokeDasharray={`${metric.value}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-card-foreground">{metric.value}%</span>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
          <h3 className="text-lg font-semibold text-card-foreground">Capabilities</h3>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <div key={cap} className="flex items-center gap-2 rounded-lg bg-muted/20 px-4 py-2.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                <span className="text-sm text-card-foreground">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integration Note */}
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-card-foreground">Note:</span> This page displays
          simulated data. In production, real-time agent metrics would be fetched from your
          trading system API.
        </p>
      </div>
    </div>
  )
}