import { useState, useCallback, useEffect, useRef } from "react";
import { PAIRS, PAIR_TO_API, API_TO_PAIR, SIGNAL_STATIC, CONVICTION_STATIC, GROWTH_STATIC } from "../lib/constants";
import { Pair, LivePairData, Signal } from "../lib/types";


const REAL_API_BASE = "https://pidsfx-app.greenforest-6c56574d.spaincentral.azurecontainerapps.io";

// Helper to map API signal string to our Signal type
function mapSignal(s: string): Signal {
  const u = s.toUpperCase();
  if (u === "BUY") return "BUY";
  if (u === "SELL") return "SELL";
  return "HOLD";
}

function deriveGrowth(signal: Signal, confidence: number): number {
  if (signal === "HOLD") return parseFloat((confidence * 0.5).toFixed(2));
  const dir = signal === "BUY" ? 1 : -1;
  const scale = 0.3 + confidence * 4.0;
  return parseFloat((dir * scale).toFixed(2));
}

export function useLiveData(pairs: Pair[]) {
  const [data, setData] = useState<Record<string, LivePairData>>(() => {
    const init: Record<string, LivePairData> = {};
    PAIRS.forEach((p) => {
      init[p] = {
        signal: SIGNAL_STATIC[p],
        conviction: CONVICTION_STATIC[p],
        growth: GROWTH_STATIC[p],
        loading: false,
        error: null,
        lastUpdated: null,
        articles: 0,
        probs: null,
        method: null,
        reason: null,
        explanation: null,
        gated: false,
        agents: {},
      };
    });
    return init;
  });

  const abortRefs = useRef<Record<string, AbortController>>({});

  const fetchPair = useCallback(async (pair: Pair) => {
    abortRefs.current[pair]?.abort();
    const ctrl = new AbortController();
    abortRefs.current[pair] = ctrl;

    setData((prev) => ({ ...prev, [pair]: { ...prev[pair], loading: true, error: null } }));

    try {
      const apiPair = PAIR_TO_API[pair];
      const res = await fetch(`${REAL_API_BASE}/predict?pair=${apiPair}&use_llm=true`, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "API returned success=false");

      const d = json.data;
      const signal = mapSignal(d.final_signal);
      const confidence = d.final_confidence;
      const conviction = Math.round(confidence * 100);
      const growth = deriveGrowth(signal, confidence);

      const sent = d.agents.sentiment;
      const sentNorm = sent ? { ...sent, available: true, articles: sent.articles_used ?? 0 } : undefined;

      setData((prev) => ({
        ...prev,
        [pair]: {
          signal,
          conviction,
          growth,
          loading: false,
          error: null,
          lastUpdated: new Date(d.timestamp),
          articles: sent?.articles_used ?? 0,
          probs: d.final_probs,
          method: d.decision_method ?? null,
          reason: d.decision_reason ?? null,
          explanation: d.explanation || null,
          gated: d.confidence_gated ?? false,
          agents: {
            sentiment: sentNorm,
            correlation: d.agents.correlation,
            geopolitical: d.agents.geopolitical,
            technical: d.agents.technical,
            macro: d.agents.macro,
          },
        },
      }));
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setData((prev) => ({
        ...prev,
        [pair]: { ...prev[pair], loading: false, error: err.message ?? "Failed to fetch" },
      }));
    }
  }, []);

  const fetchAll = useCallback(async (pairsToFetch: Pair[]) => {
    pairsToFetch.forEach((p) =>
      setData((prev) => ({ ...prev, [p]: { ...prev[p], loading: true, error: null } }))
    );
    try {
      const res = await fetch(`${REAL_API_BASE}/predict_all?use_llm=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: {
        success: boolean;
        data: Record<
          string,
          {
            signal: string;
            confidence: number;
            gated: boolean;
            probs: { buy: number; hold: number; sell: number };
            method: string;
          }
        >;
      } = await res.json();
      if (!json.success) throw new Error("predict_all returned success=false");

      Object.entries(json.data).forEach(([apiKey, val]) => {
        const pair = API_TO_PAIR[apiKey];
        if (!pair || !pairsToFetch.includes(pair)) return;
        const signal = mapSignal(val.signal);
        const confidence = val.confidence;
        const conviction = Math.round(confidence * 100);
        const growth = deriveGrowth(signal, confidence);
        setData((prev) => ({
          ...prev,
          [pair]: {
            ...prev[pair],
            signal,
            conviction,
            growth,
            loading: true,
            probs: val.probs,
            method: val.method,
            gated: val.gated,
            lastUpdated: new Date(),
          },
        }));
      });

      await Promise.allSettled(pairsToFetch.map((p) => fetchPair(p)));
    } catch {
      await Promise.allSettled(pairsToFetch.map((p) => fetchPair(p)));
    }
  }, [fetchPair]);

  useEffect(() => {
    fetchAll(pairs);
    return () => {
      Object.values(abortRefs.current).forEach((c) => c.abort());
    };
  }, [pairs.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback((pair: Pair) => fetchPair(pair), [fetchPair]);
  const refetchAll = useCallback(() => fetchAll(pairs), [pairs, fetchAll]);

  return { data, refetch, refetchAll };
}