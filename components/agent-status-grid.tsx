"use client"

import Link from "next/link"
import { agents } from "@/lib/agents"
import { cn } from "@/lib/utils"

export function AgentStatusGrid() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Agent Status</h3>
        <Link
          href="/agents"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View All
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}`}
            className="group rounded-lg border border-border bg-muted/30 p-4 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <agent.icon className="h-5 w-5" style={{ color: agent.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-card-foreground group-hover:text-primary">
                  {agent.shortName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      agent.status === "online" && "bg-accent",
                      agent.status === "offline" && "bg-destructive",
                      agent.status === "processing" && "bg-secondary animate-pulse"
                    )}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Accuracy</span>
              <span className="text-sm font-bold text-card-foreground">{agent.accuracy}%</span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${agent.accuracy}%`,
                  backgroundColor: agent.color,
                }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
