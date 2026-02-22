"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const performanceData = [
  { date: "Jan 1", accuracy: 78, signals: 45, profit: 2.3 },
  { date: "Jan 8", accuracy: 82, signals: 52, profit: 3.1 },
  { date: "Jan 15", accuracy: 79, signals: 48, profit: 2.8 },
  { date: "Jan 22", accuracy: 85, signals: 61, profit: 4.2 },
  { date: "Jan 29", accuracy: 81, signals: 55, profit: 3.5 },
  { date: "Feb 5", accuracy: 88, signals: 67, profit: 5.1 },
  { date: "Feb 12", accuracy: 84, signals: 58, profit: 4.0 },
  { date: "Feb 19", accuracy: 86, signals: 63, profit: 4.7 },
  { date: "Feb 26", accuracy: 83, signals: 54, profit: 3.8 },
  { date: "Mar 4", accuracy: 87, signals: 69, profit: 5.4 },
]

interface PerformanceChartProps {
  title?: string
  showSignals?: boolean
  height?: number
}

export function PerformanceChart({
  title = "System Performance",
  showSignals = true,
  height = 300,
}: PerformanceChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-black/5">
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Accuracy and signal generation over time
      </p>

      <div className="mt-6" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              domain={[60, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f9fafb",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="accuracy"
              name="Accuracy %"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#3b82f6" }}
            />
            {showSignals && (
              <Line
                type="monotone"
                dataKey="signals"
                name="Signals"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#8b5cf6" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
