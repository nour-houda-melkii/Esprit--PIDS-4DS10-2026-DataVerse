import { NextRequest, NextResponse } from "next/server";

// Server-side only — your real Azure / Render URL
const API_URL = process.env.API_URL ?? "";

export async function GET(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      {
        success: false,
        error: "API_URL environment variable is not set. Add it to .env.local or Vercel settings.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = req.nextUrl;
  const pair   = searchParams.get("pair")    ?? "EURUSD";
  const useLlm = searchParams.get("use_llm") ?? "true";

  // Strip "/" from pair (EUR/USD → EURUSD)
  const cleanPair = pair.replace("/", "").replace("-", "");

  const backendUrl = `${API_URL}/predict?pair=${encodeURIComponent(cleanPair)}&use_llm=${useLlm}`;

  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const raw = await res.json();

    // ── Normalise the full central-brain response into a flat shape
    //    the frontend can consume without guessing field names.
    //
    // Expected raw shape (central_brain_v7):
    // {
    //   pair, timestamp, final_signal, final_confidence, confidence_gated,
    //   final_probs: { buy, hold, sell },
    //   decision_method, decision_reason, explanation,
    //   agents: {
    //     sentiment:    { signal, confidence, probs, model_votes, articles_used, ensemble_info }
    //     correlation:  { signal, confidence, probs, sharpe, last_proba_up, last_regime, score, available }
    //     geopolitical: { signal, confidence, probs, model_votes, agreement, strength, close_price, date, available }
    //     technical:    { signal, confidence, probs, tf_votes, available }
    //     macro:        { signal, confidence, probs, pair_score, base_score, quote_score, summary, drivers, available }
    //   }
    // }

    const agents  = raw.agents ?? {};
    const sent    = agents.sentiment    ?? {};
    const corr    = agents.correlation  ?? {};
    const geo     = agents.geopolitical ?? {};
    const tech    = agents.technical    ?? {};
    const macro   = agents.macro        ?? {};

    const normalised = {
      // ── top-level signal (from meta-model or rule-based)
      signal:     (raw.final_signal     ?? "hold").toUpperCase() as "BUY" | "SELL" | "HOLD",
      confidence: raw.final_confidence  ?? 0,
      probs:      raw.final_probs       ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
      gated:      raw.confidence_gated  ?? false,
      method:     raw.decision_method   ?? "rule_based",
      reason:     raw.decision_reason   ?? "",
      explanation: raw.explanation      ?? "",
      timestamp:  raw.timestamp         ?? new Date().toISOString(),

      // ── sentiment agent
      sentiment: {
        signal:      (sent.signal ?? "hold").toUpperCase(),
        confidence:  sent.confidence ?? 0,
        probs:       sent.probs      ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
        model_votes: sent.model_votes ?? {},
        articles:    sent.articles_used ?? 0,
        available:   true,
      },

      // ── correlation agent
      correlation: {
        signal:     (corr.signal ?? "hold").toUpperCase(),
        confidence: corr.confidence   ?? 0,
        probs:      corr.probs        ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
        sharpe:     corr.sharpe       ?? 0,
        regime:     corr.last_regime  ?? 0.5,
        score:      corr.score        ?? 0.5,
        available:  corr.available    ?? false,
      },

      // ── geopolitical agent
      geopolitical: {
        signal:     (geo.signal ?? "hold").toUpperCase(),
        confidence: geo.confidence  ?? 0,
        probs:      geo.probs       ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
        model_votes: geo.model_votes ?? {},
        agreement:  geo.agreement   ?? "N/A",
        strength:   geo.strength    ?? "N/A",
        available:  geo.available   ?? false,
      },

      // ── technical agent
      technical: {
        signal:     (tech.signal ?? "hold").toUpperCase(),
        confidence: tech.confidence ?? 0,
        probs:      tech.probs      ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
        tf_votes:   tech.tf_votes   ?? {},
        available:  tech.available  ?? false,
      },

      // ── macro agent
      macro: {
        signal:      (macro.signal ?? "hold").toUpperCase(),
        confidence:  macro.confidence  ?? 0,
        probs:       macro.probs       ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
        pair_score:  macro.pair_score  ?? 0,
        base_score:  macro.base_score  ?? 0,
        quote_score: macro.quote_score ?? 0,
        summary:     macro.summary     ?? "",
        drivers:     macro.drivers     ?? [],
        available:   macro.available   ?? false,
      },
    };

    return NextResponse.json(normalised, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Proxy fetch failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
