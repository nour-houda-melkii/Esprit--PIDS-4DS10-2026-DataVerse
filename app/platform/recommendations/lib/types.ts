export type Pair = "EUR/USD" | "GBP/USD" | "USD/JPY" | "USD/CHF" | "EUR/JPY" | "GBP/JPY" | "EUR/GBP";
export type Signal = "BUY" | "SELL" | "HOLD";

export interface AgentProbs {
  buy: number;
  hold: number;
  sell: number;
}

export interface SentimentAgent {
  signal: Signal;
  confidence: number;
  probs: AgentProbs;
  model_votes?: Record<string, Record<string, number>>;
  articles_used?: number;
  available: boolean;
}

export interface CorrelationAgent {
  signal: Signal;
  confidence: number;
  probs: AgentProbs;
  sharpe: number;
  regime: number;
  score: number;
  available: boolean;
}

export interface GeopoliticalAgent {
  signal: Signal;
  confidence: number;
  probs: AgentProbs;
  model_votes?: Record<string, Record<string, number>>;
  agreement: string;
  strength: string;
  available: boolean;
}

export interface TechnicalAgent {
  signal: Signal;
  confidence: number;
  probs: AgentProbs;
  tf_votes?: Record<string, Record<string, number>>;
  available: boolean;
}

export interface MacroAgent {
  signal: Signal;
  confidence: number;
  probs: AgentProbs;
  pair_score: number;
  base_score: number;
  quote_score: number;
  summary: string;
  drivers: string[];
  available: boolean;
}

export interface LivePairData {
  signal: Signal;
  conviction: number;
  growth: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  articles: number;
  probs: AgentProbs | null;
  method: string | null;
  reason: string | null;
  explanation: string | null;
  gated: boolean;
  agents: {
    sentiment?: SentimentAgent;
    correlation?: CorrelationAgent;
    geopolitical?: GeopoliticalAgent;
    technical?: TechnicalAgent;
    macro?: MacroAgent;
  };
}

export interface Scenario {
  id: string;
  name: string;
  emoji: string;
  probability: number;
  shockType: "bullish" | "bearish" | "neutral";
  shockMagnitude: number;
  description: string;
  macroContext: string;
  triggerEvent: string;
  pairEffects: Record<string, { direction: -1 | 0 | 1; magnitude: number }>;
}