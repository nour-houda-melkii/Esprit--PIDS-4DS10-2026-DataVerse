"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// Generate random performance data for the agent
const generatePerformanceData = () => {
  const data = []
  const baseAccuracy = 80
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      accuracy: Math.round(baseAccuracy + Math.random() * 15 - 5),
      signals: Math.round(5 + Math.random() * 10),
    })
  }
  return data
}

interface AgentPerformanceChartProps {
  agentColor: string
  agentName: string
}

export function AgentPerformanceChart({
  agentColor,
  agentName,
}: AgentPerformanceChartProps) {
  const data = generatePerformanceData()

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
      <h3 className="text-lg font-semibold text-card-foreground">
        Performance History
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {agentName} accuracy over the last 30 days
      </p>

      <div className="mt-6 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${agentColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={agentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={agentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              domain={[60, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f9fafb",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(value: number) => [`${value}%`, "Accuracy"]}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke={agentColor}
              strokeWidth={2}
              fill={`url(#gradient-${agentColor})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
