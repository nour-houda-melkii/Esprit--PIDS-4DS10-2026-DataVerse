import { Pair } from "./types";

export const PAIRS: Pair[] = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "EUR/JPY", "GBP/JPY", "EUR/GBP"];

export const PAIR_TO_API: Record<Pair, string> = {
  "EUR/USD": "EURUSD",
  "GBP/USD": "GBPUSD",
  "USD/JPY": "USDJPY",
  "USD/CHF": "USDCHF",
  "EUR/JPY": "EURJPY",
  "GBP/JPY": "GBPJPY",
};

export const API_TO_PAIR: Record<string, Pair> = Object.fromEntries(
  Object.entries(PAIR_TO_API).map(([k, v]) => [v, k as Pair])
) as Record<string, Pair>;

export const FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
};

// Static fallbacks (used until live data arrives)
export const SIGNAL_STATIC: Record<Pair, Signal> = {
  "EUR/USD": "HOLD",
  "GBP/USD": "HOLD",
  "USD/JPY": "HOLD",
  "USD/CHF": "HOLD",
  "EUR/JPY": "HOLD",
  "GBP/JPY": "HOLD",
};

export const CONVICTION_STATIC: Record<Pair, number> = {
  "EUR/USD": 45,
  "GBP/USD": 45,
  "USD/JPY": 45,
  "USD/CHF": 45,
  "EUR/JPY": 45,
  "GBP/JPY": 45,
};

export const GROWTH_STATIC: Record<Pair, number> = {
  "EUR/USD": 0,
  "GBP/USD": 0,
  "USD/JPY": 0,
  "USD/CHF": 0,
  "EUR/JPY": 0,
  "GBP/JPY": 0,
};

export const PRICE: Record<Pair, string> = {
  "EUR/USD": "1.0842",
  "GBP/USD": "1.2618",
  "USD/JPY": "151.34",
  "USD/CHF": "0.9021",
  "EUR/JPY": "163.21",
  "GBP/JPY": "190.98",
  "EUR/GBP": "0.8591",
};

export const CHANGE: Record<Pair, number> = {
  "EUR/USD": 0.0024,
  "GBP/USD": -0.0038,
  "USD/JPY": 0.42,
  "USD/CHF": 0.0008,
  "EUR/JPY": 0.31,
  "GBP/JPY": 0.87,
  "EUR/GBP": 0.0002,
};

export const TARGET: Record<Pair, { tp: string; sl: string; entry: string }> = {
  "EUR/USD": { entry: "1.0820", tp: "1.1090", sl: "1.0720" },
  "GBP/USD": { entry: "1.2660", tp: "1.2360", sl: "1.2750" },
  "USD/JPY": { entry: "151.00", tp: "153.80", sl: "149.50" },
  "USD/CHF": { entry: "0.9021", tp: "0.9080", sl: "0.8960" },
  "EUR/JPY": { entry: "163.00", tp: "167.00", sl: "160.50" },
  "GBP/JPY": { entry: "190.50", tp: "196.00", sl: "187.50" },
};

export const PIPS: Record<Pair, number> = {
  "EUR/USD": 248,
  "GBP/USD": 258,
  "USD/JPY": 246,
  "USD/CHF": 60,
  "EUR/JPY": 350,
  "GBP/JPY": 502,
};

export const RR: Record<Pair, string> = {
  "EUR/USD": "2.1:1",
  "GBP/USD": "1.9:1",
  "USD/JPY": "2.6:1",
  "USD/CHF": "1.2:1",
  "EUR/JPY": "2.0:1",
  "GBP/JPY": "2.4:1",
};

export const TIMEFRAME: Record<Pair, string> = {
  "EUR/USD": "4–12 hrs",
  "GBP/USD": "1–3 days",
  "USD/JPY": "1–5 days",
  "USD/CHF": "Watch only",
  "EUR/JPY": "1–3 days",
  "GBP/JPY": "2–7 days",
};

export const VOLATILITY: Record<Pair, "LOW" | "MEDIUM" | "HIGH"> = {
  "EUR/USD": "MEDIUM",
  "GBP/USD": "HIGH",
  "USD/JPY": "HIGH",
  "USD/CHF": "LOW",
  "EUR/JPY": "HIGH",
  "GBP/JPY": "HIGH",
};

export const HISTORY: Record<Pair, number[]> = {
  "EUR/USD": [1.071, 1.075, 1.073, 1.078, 1.076, 1.080, 1.079, 1.082, 1.081, 1.083, 1.082, 1.085, 1.084, 1.0842],
  "GBP/USD": [1.282, 1.278, 1.275, 1.271, 1.274, 1.268, 1.265, 1.263, 1.268, 1.264, 1.261, 1.263, 1.260, 1.2618],
  "USD/JPY": [148.2, 148.9, 149.4, 150.1, 149.8, 150.5, 150.9, 151.0, 150.7, 151.1, 151.2, 151.0, 151.3, 151.34],
  "USD/CHF": [0.898, 0.901, 0.899, 0.903, 0.901, 0.902, 0.900, 0.903, 0.901, 0.902, 0.902, 0.901, 0.903, 0.9021],
  "EUR/JPY": [158.2, 159.1, 160.4, 161.2, 160.8, 161.5, 162.0, 162.8, 162.3, 163.0, 163.1, 163.0, 163.2, 163.21],
  "GBP/JPY": [186.1, 187.4, 188.0, 188.9, 188.5, 189.2, 189.8, 190.1, 189.7, 190.3, 190.5, 190.7, 190.9, 190.98],
};