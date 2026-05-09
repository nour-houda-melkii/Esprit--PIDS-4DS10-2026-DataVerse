import Link from "next/link"
import { agents } from "@/lib/agents"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Agents</h1>
        <p className="mt-1 text-muted-foreground">
          5 specialized AI agents working together to generate trading signals
        </p>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5 transition-all hover:border-primary/50 hover:shadow-xl"
          >
            {/* Colored accent bar */}
            <div
              className="absolute left-0 top-0 h-1 w-full"
              style={{ backgroundColor: agent.color }}
            />

            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <agent.icon
                  className="h-7 w-7"
                  style={{ color: agent.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary">
                  {agent.name}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      agent.status === "online" && "bg-accent",
                      agent.status === "offline" && "bg-destructive",
                      agent.status === "processing" &&
                        "bg-secondary animate-pulse"
                    )}
                  />
                  <span className="text-sm capitalize text-muted-foreground">
                    {agent.status}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground">
                    Updated {agent.lastUpdated}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
              {agent.description}
            </p>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="mt-1 text-xl font-bold text-card-foreground">
                  {agent.accuracy}%
                </p>
                {/* Mini progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${agent.accuracy}%`,
                      backgroundColor: agent.color,
                    }}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Response Time</p>
                <p className="mt-1 text-xl font-bold text-card-foreground">
                  {agent.responseTime}
                </p>
                <p className="mt-2 text-xs text-accent">Fast</p>
              </div>
            </div>

            {/* View Details Link */}
            <div className="mt-6 flex items-center justify-end text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View Details
              <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* System Overview Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        <h3 className="text-lg font-semibold text-card-foreground">
          Multi-Agent System Overview
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Our trading system uses a consensus-based approach where all 5 AI
          agents analyze market conditions independently. Each agent specializes
          in a different domain of analysis, and their collective insights are
          weighted by historical accuracy to generate the final trading signal.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {agents.map((agent) => (
            <div key={agent.id} className="text-center">
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <agent.icon
                  className="h-5 w-5"
                  style={{ color: agent.color }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-card-foreground">
                {agent.shortName}
              </p>
              <p className="text-xs text-muted-foreground">{agent.accuracy}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
