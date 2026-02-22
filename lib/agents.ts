import {
  TrendingUp,
  BarChart3,
  MessageSquare,
  Globe2,
  GitBranch,
} from "lucide-react"

export interface Agent {
  id: string
  name: string
  shortName: string
  description: string
  icon: typeof TrendingUp
  color: string
  futureAnalysisPreview: string
  capabilities: string[]
}

export const agents: Agent[] = [
  {
    id: "macroeconomic",
    name: "Macroeconomic Agent",
    shortName: "Macro",
    description:
      "Analyzes global economic indicators, central bank policies, GDP data, inflation rates, and employment figures to predict currency movements based on fundamental economic health.",
    icon: TrendingUp,
    color: "#06b6d4",
    futureAnalysisPreview:
      "Real-time economic indicator tracking with AI-powered impact predictions on major currency pairs.",
    capabilities: [
      "Central bank policy analysis",
      "GDP & inflation tracking",
      "Employment data processing",
      "Interest rate forecasting",
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
    futureAnalysisPreview:
      "Chart pattern detection with machine learning-enhanced indicator signals and price level analysis.",
    capabilities: [
      "Pattern recognition",
      "Support/resistance detection",
      "Multi-timeframe analysis",
      "Indicator convergence signals",
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
    futureAnalysisPreview:
      "NLP-driven sentiment scoring across thousands of sources with contrarian signal detection.",
    capabilities: [
      "News sentiment analysis",
      "Social media monitoring",
      "Positioning data tracking",
      "Contrarian opportunity alerts",
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
    futureAnalysisPreview:
      "Global event monitoring with currency impact assessment and safe-haven flow predictions.",
    capabilities: [
      "Political event tracking",
      "Trade relation analysis",
      "Risk level assessment",
      "Safe-haven flow detection",
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
    futureAnalysisPreview:
      "Cross-asset correlation mapping with divergence alerts and convergence trade opportunities.",
    capabilities: [
      "Inter-market analysis",
      "Commodity correlations",
      "Bond yield tracking",
      "Divergence detection",
    ],
  },
]

export function getAgentById(id: string): Agent | undefined {
  return agents.find((agent) => agent.id === id)
}
