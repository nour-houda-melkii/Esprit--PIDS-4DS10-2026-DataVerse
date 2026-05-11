export interface CurrencyPair {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

export interface TradingSignal {
  id: string
  timestamp: string
  pair: string
  decision: "BUY" | "SELL" | "HOLD"
  conviction: number
  agents: string[]
  reasoning: string
  status: "active" | "closed" | "expired"
  outcome?: "profit" | "loss" | "pending"
}

// Initial market data - will be simulated in components
export const initialMarketData: CurrencyPair[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: 1.0876, change: 0.0023, changePercent: 0.21 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", price: 1.2654, change: -0.0018, changePercent: -0.14 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", price: 149.82, change: 0.45, changePercent: 0.30 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", price: 0.8823, change: -0.0012, changePercent: -0.14 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", price: 0.6542, change: 0.0031, changePercent: 0.48 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", price: 1.3621, change: 0.0008, changePercent: 0.06 },
]

// Historical signals data
export const historicalSignals: TradingSignal[] = [
  {
    id: "sig-001",
    timestamp: "2026-02-04T14:32:00Z",
    pair: "EUR/USD",
    decision: "BUY",
    conviction: 78,
    agents: ["macroeconomic", "technical", "sentiment"],
    reasoning: "Strong ECB hawkish signals combined with technical breakout above 1.0850 resistance.",
    status: "active",
    outcome: "pending",
  },
  {
    id: "sig-002",
    timestamp: "2026-02-04T12:15:00Z",
    pair: "GBP/USD",
    decision: "SELL",
    conviction: -65,
    agents: ["geopolitical", "sentiment"],
    reasoning: "UK economic data disappointing, risk-off sentiment increasing.",
    status: "active",
    outcome: "pending",
  },
  {
    id: "sig-003",
    timestamp: "2026-02-04T09:45:00Z",
    pair: "USD/JPY",
    decision: "BUY",
    conviction: 82,
    agents: ["macroeconomic", "correlations", "technical"],
    reasoning: "Yield differential favoring USD, technical momentum strong.",
    status: "closed",
    outcome: "profit",
  },
  {
    id: "sig-004",
    timestamp: "2026-02-03T16:20:00Z",
    pair: "AUD/USD",
    decision: "BUY",
    conviction: 54,
    agents: ["correlations", "sentiment"],
    reasoning: "Risk-on sentiment returning, commodity prices supportive.",
    status: "closed",
    outcome: "profit",
  },
  {
    id: "sig-005",
    timestamp: "2026-02-03T11:00:00Z",
    pair: "USD/CHF",
    decision: "SELL",
    conviction: -71,
    agents: ["geopolitical", "macroeconomic"],
    reasoning: "Safe haven demand for CHF amid geopolitical tensions.",
    status: "closed",
    outcome: "loss",
  },
  {
    id: "sig-006",
    timestamp: "2026-02-03T08:30:00Z",
    pair: "EUR/USD",
    decision: "HOLD",
    conviction: 12,
    agents: ["technical", "sentiment"],
    reasoning: "Mixed signals, awaiting ECB policy clarification.",
    status: "expired",
  },
  {
    id: "sig-007",
    timestamp: "2026-02-02T15:45:00Z",
    pair: "GBP/JPY",
    decision: "SELL",
    conviction: -88,
    agents: ["macroeconomic", "technical", "geopolitical", "sentiment"],
    reasoning: "Strong consensus across all agents - UK weakness + JPY strength.",
    status: "closed",
    outcome: "profit",
  },
  {
    id: "sig-008",
    timestamp: "2026-02-02T10:15:00Z",
    pair: "USD/CAD",
    decision: "BUY",
    conviction: 45,
    agents: ["correlations"],
    reasoning: "Oil prices declining, supporting USD/CAD upside.",
    status: "closed",
    outcome: "profit",
  },
]

// Data pipeline sources
export interface DataSource {
  id: string
  name: string
  type: "api" | "stream" | "batch"
  status: "connected" | "disconnected" | "error"
  latency: string
  lastUpdate: string
  recordsProcessed: number
}

export const dataSources: DataSource[] = [
  { id: "ds-001", name: "Reuters Forex Feed", type: "stream", status: "connected", latency: "12ms", lastUpdate: "Just now", recordsProcessed: 1247832 },
  { id: "ds-002", name: "Bloomberg Terminal", type: "stream", status: "connected", latency: "8ms", lastUpdate: "Just now", recordsProcessed: 892341 },
  { id: "ds-003", name: "ECB Data Warehouse", type: "api", status: "connected", latency: "145ms", lastUpdate: "5 min ago", recordsProcessed: 45621 },
  { id: "ds-004", name: "Fed Economic Data", type: "api", status: "connected", latency: "89ms", lastUpdate: "2 min ago", recordsProcessed: 78432 },
  { id: "ds-005", name: "Twitter/X Sentiment", type: "stream", status: "connected", latency: "234ms", lastUpdate: "Just now", recordsProcessed: 2341567 },
  { id: "ds-006", name: "Reddit Finance", type: "batch", status: "connected", latency: "1.2s", lastUpdate: "15 min ago", recordsProcessed: 123456 },
  { id: "ds-007", name: "OANDA Price Feed", type: "stream", status: "connected", latency: "5ms", lastUpdate: "Just now", recordsProcessed: 4523178 },
  { id: "ds-008", name: "Investing.com Calendar", type: "api", status: "error", latency: "N/A", lastUpdate: "1 hour ago", recordsProcessed: 8923 },
]
