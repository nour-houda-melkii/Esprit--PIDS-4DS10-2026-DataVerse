import {
  TrendingUp,
  BarChart3,
  MessageSquare,
  Globe2,
  GitBranch,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentKPI {
  label: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
}

export interface Agent {
  id: string
  name: string
  shortName: string
  description: string
  icon: typeof TrendingUp
  color: string
  status: "online" | "offline" | "processing"
  lastUpdated: string
  accuracy: number
  responseTime: string
  futureAnalysisPreview: string
  capabilities: string[]
  kpis: AgentKPI[]
  recentAnalysis: string[]
}

// ─── Agent data ───────────────────────────────────────────────────────────────

export const agents: Agent[] = [
  {
    id: "macroeconomic",
    name: "Macroeconomic Agent",
    shortName: "Macro",
    description:
      "Analyzes global economic indicators, central bank policies, GDP data, inflation rates, and employment figures to predict currency movements based on fundamental economic health.",
    icon: TrendingUp,
    color: "#06b6d4",
    status: "online",
    lastUpdated: "2 min ago",
    accuracy: 84,
    responseTime: "1.2s",
    futureAnalysisPreview:
      "Real-time economic indicator tracking with AI-powered impact predictions on major currency pairs.",
    capabilities: [
      "Central bank policy analysis",
      "GDP & inflation tracking",
      "Employment data processing",
      "Interest rate forecasting",
    ],
    kpis: [
      { label: "Accuracy",        value: "84%",    change: "+2.1%",  trend: "up"      },
      { label: "Signals Today",   value: "12",     change: "+3",     trend: "up"      },
      { label: "Avg Confidence",  value: "76%",    change: "-0.5%",  trend: "down"    },
      { label: "Response Time",   value: "1.2s",   change: "Stable", trend: "neutral" },
    ],
    recentAnalysis: [
      "Fed minutes indicate a hawkish stance — USD likely to strengthen against majors.",
      "EU CPI came in above expectations at 2.8%; EUR/USD upside pressure building.",
      "Bank of Japan maintaining yield curve control — JPY weakness persists.",
      "UK employment data beat forecasts; GBP/USD bullish bias for the session.",
    ],
  },
  {
    id: "technical",
    name: "Technical Analysis Agent",
    shortName: "Technical",
    description:
      "Employs advanced pattern recognition, support/resistance levels, moving averages, RSI, MACD, and proprietary indicators to identify optimal entry and exit points.",
    icon: BarChart3,
    color: "#8b5cf6",
    status: "online",
    lastUpdated: "1 min ago",
    accuracy: 79,
    responseTime: "0.8s",
    futureAnalysisPreview:
      "Chart pattern detection with machine learning-enhanced indicator signals and price level analysis.",
    capabilities: [
      "Pattern recognition",
      "Support/resistance detection",
      "Multi-timeframe analysis",
      "Indicator convergence signals",
    ],
    kpis: [
      { label: "Accuracy",        value: "79%",   change: "+1.4%",  trend: "up"      },
      { label: "Signals Today",   value: "19",    change: "+5",     trend: "up"      },
      { label: "Avg Confidence",  value: "81%",   change: "+1.2%",  trend: "up"      },
      { label: "Response Time",   value: "0.8s",  change: "Stable", trend: "neutral" },
    ],
    recentAnalysis: [
      "EUR/USD forming ascending triangle on H4 — breakout target 1.0980.",
      "GBP/JPY RSI divergence detected on Daily; potential reversal signal.",
      "USD/CHF holding key support at 0.8850 — watch for bounce confirmation.",
      "Gold (XAU/USD) 200 EMA acting as dynamic resistance at $2,345.",
    ],
  },
  {
    id: "sentiment",
    name: "Sentiment Analysis Agent",
    shortName: "Sentiment",
    description:
      "Processes news feeds, social media, trading forums, and market positioning data to gauge market sentiment and identify potential contrarian opportunities.",
    icon: MessageSquare,
    color: "#0d9488",
    status: "processing",
    lastUpdated: "5 min ago",
    accuracy: 72,
    responseTime: "2.1s",
    futureAnalysisPreview:
      "NLP-driven sentiment scoring across thousands of sources with contrarian signal detection.",
    capabilities: [
      "News sentiment analysis",
      "Social media monitoring",
      "Positioning data tracking",
      "Contrarian opportunity alerts",
    ],
    kpis: [
      { label: "Accuracy",        value: "72%",   change: "+0.8%",  trend: "up"      },
      { label: "Sources Scanned", value: "4,820", change: "+312",   trend: "up"      },
      { label: "Sentiment Score", value: "62/100",change: "+4pts",  trend: "up"      },
      { label: "Response Time",   value: "2.1s",  change: "+0.3s",  trend: "down"    },
    ],
    recentAnalysis: [
      "Retail sentiment on EUR/USD is 78% long — contrarian signal suggests downside.",
      "Twitter/X chatter around JPY carry trade unwinding is increasing rapidly.",
      "COT data shows large speculators net short GBP at highest level in 6 months.",
      "News sentiment for AUD turned negative after China PMI miss.",
    ],
  },
  {
    id: "geopolitical",
    name: "Geopolitical Risk Agent",
    shortName: "Geopolitical",
    description:
      "Monitors global political events, trade relations, sanctions, elections, and conflicts to assess their potential impact on currency valuations and safe-haven flows.",
    icon: Globe2,
    color: "#f59e0b",
    status: "online",
    lastUpdated: "8 min ago",
    accuracy: 68,
    responseTime: "1.7s",
    futureAnalysisPreview:
      "Global event monitoring with currency impact assessment and safe-haven flow predictions.",
    capabilities: [
      "Political event tracking",
      "Trade relation analysis",
      "Risk level assessment",
      "Safe-haven flow detection",
    ],
    kpis: [
      { label: "Accuracy",        value: "68%",   change: "-0.5%",  trend: "down"    },
      { label: "Events Tracked",  value: "143",   change: "+11",    trend: "up"      },
      { label: "Risk Level",      value: "Medium",change: "Stable", trend: "neutral" },
      { label: "Response Time",   value: "1.7s",  change: "Stable", trend: "neutral" },
    ],
    recentAnalysis: [
      "Middle East tensions elevating safe-haven demand — CHF and gold benefiting.",
      "US-China trade talks stalling; AUD and NZD under pressure from risk-off flows.",
      "French political uncertainty weighing on EUR; spread vs Bunds widening.",
      "Canada elections approaching — CAD volatility expected to rise near term.",
    ],
  },
  {
    id: "correlations",
    name: "Correlations Agent",
    shortName: "Correlations",
    description:
      "Analyzes inter-market relationships including equity indices, commodities, bonds, and cross-currency correlations to identify divergences and convergence opportunities.",
    icon: GitBranch,
    color: "#ec4899",
    status: "online",
    lastUpdated: "3 min ago",
    accuracy: 77,
    responseTime: "1.4s",
    futureAnalysisPreview:
      "Cross-asset correlation mapping with divergence alerts and convergence trade opportunities.",
    capabilities: [
      "Inter-market analysis",
      "Commodity correlations",
      "Bond yield tracking",
      "Divergence detection",
    ],
    kpis: [
      { label: "Accuracy",           value: "77%",  change: "+1.9%",  trend: "up"      },
      { label: "Pairs Monitored",    value: "38",   change: "+2",     trend: "up"      },
      { label: "Active Divergences", value: "5",    change: "+1",     trend: "up"      },
      { label: "Response Time",      value: "1.4s", change: "Stable", trend: "neutral" },
    ],
    recentAnalysis: [
      "DXY rising while US equities hold — unusual divergence, watch for resolution.",
      "Oil and CAD correlation breaking down; potential mean-reversion trade forming.",
      "US 10Y yield spike not reflected in USD/JPY yet — lag opportunity identified.",
      "Gold/USD inverse correlation at 30-day high — risk-off environment confirmed.",
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAgentById(id: string): Agent | undefined {
  return agents.find((agent) => agent.id === id)
}