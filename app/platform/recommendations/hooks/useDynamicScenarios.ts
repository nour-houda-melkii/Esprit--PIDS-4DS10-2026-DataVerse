import { useState, useEffect, useCallback } from "react";
import { Pair, Signal, Scenario } from "../lib/types";

const FALLBACK_SCENARIOS: Scenario[] = [
    {
    id: "fed_hawkish", name: "Fed Hawkish Surprise", emoji: "🏦", probability: 28,
    shockType: "bearish", shockMagnitude: 0.72,
    description: "Fed signals rates stay higher for longer, reversing cut expectations. USD rallies hard.",
    macroContext: "DXY spikes above 104. US 10Y yields jump 25–35bp. Risk assets sell off globally.",
    triggerEvent: "FOMC minutes, hawkish Fed speaker, or US CPI beats by 0.3%+",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.80 },
      "GBP/USD": { direction: -1, magnitude: 0.75 },
      "USD/JPY": { direction:  1, magnitude: 0.85 },
      "USD/CHF": { direction:  1, magnitude: 0.70 },
      "EUR/GBP": { direction:  0, magnitude: 0.10 },
      "GBP/JPY": { direction:  1, magnitude: 0.60 },
    },
  },
  {
    id: "risk_off", name: "Global Risk-Off Shock", emoji: "⚡", probability: 18,
    shockType: "bearish", shockMagnitude: 0.88,
    description: "Geopolitical escalation triggers flight to safety into JPY and CHF.",
    macroContext: "JPY and CHF surge. VIX spikes above 25. Equities fall 3%+.",
    triggerEvent: "Major equity index drops 3%+ intraday, VIX spikes above 25",
    pairEffects: {
      "EUR/USD": { direction: -1, magnitude: 0.40 },
      "GBP/USD": { direction: -1, magnitude: 0.80 },
      "USD/JPY": { direction: -1, magnitude: 0.92 },
      "USD/CHF": { direction: -1, magnitude: 0.82 },
      "EUR/GBP": { direction:  1, magnitude: 0.50 },
      "GBP/JPY": { direction: -1, magnitude: 0.96 },
    },
  },
  {
    id: "soft_landing", name: "US Soft Landing", emoji: "🌤️", probability: 42,
    shockType: "bullish", shockMagnitude: 0.55,
    description: "US inflation cools while labour market stays resilient. Rate cut expectations firm.",
    macroContext: "USD weakens moderately. EUR, GBP recover. Carry trades rewarded.",
    triggerEvent: "CPI MoM below 0.2% + NFP 150–200K + dovish Fed tone",
    pairEffects: {
      "EUR/USD": { direction:  1, magnitude: 0.65 },
      "GBP/USD": { direction:  1, magnitude: 0.55 },
      "USD/JPY": { direction: -1, magnitude: 0.40 },
      "USD/CHF": { direction: -1, magnitude: 0.50 },
      "EUR/GBP": { direction:  0, magnitude: 0.15 },
      "GBP/JPY": { direction:  1, magnitude: 0.45 },
    },
  },
];

export function useDynamicScenarios(
  pair: Pair,
  signal: Signal,
  conviction: number,
  growth: number,
  price: string
) {
  const [scenarios, setScenarios] = useState<Scenario[]>(FALLBACK_SCENARIOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [lastPair, setLastPair] = useState<string | null>(null);

  const fetchScenarios = useCallback(
    async (force = false) => {
      if (!force && lastPair === pair && generated) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pair, signal, conviction, growth, price }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        if (data.scenarios?.length >= 1) {
          setScenarios(data.scenarios);
          setGenerated(true);
          setLastPair(pair);
        } else {
          throw new Error("No scenarios returned");
        }
      } catch (err: any) {
        setError(err.message);
        setScenarios(FALLBACK_SCENARIOS);
      } finally {
        setLoading(false);
      }
    },
    [pair, signal, conviction, growth, price, lastPair, generated]
  );

  useEffect(() => {
    fetchScenarios();
  }, [pair]); // eslint-disable-line react-hooks/exhaustive-deps

  return { scenarios, loading, error, generated, refetch: () => fetchScenarios(true) };
}