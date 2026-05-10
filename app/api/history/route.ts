import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "";

export async function GET(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { success: false, error: "API_URL environment variable is not set." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${API_URL}/signals`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const raw = await res.json();

    // raw.data is the latest predict_all snapshot:
    // { success, timestamp, predictions_count, errors_count, data: { EURUSD: {...}, ... } }
    const snapshot = raw.data ?? raw;

    if (!snapshot?.data) {
      return NextResponse.json(
        { success: false, error: "No signal data available yet. Run /predict_all first." },
        { status: 404 }
      );
    }

    // Normalise each pair into a flat row matching predict/route.ts conventions
    const pairs = Object.entries(snapshot.data as Record<string, {
      signal: string;
      confidence: number;
      gated: boolean;
      probs: { buy: number; hold: number; sell: number };
      method: string;
    }>).map(([pair, v]) => ({
      pair,
      signal:     (v.signal ?? "hold").toUpperCase() as "BUY" | "SELL" | "HOLD",
      confidence: v.confidence ?? 0,
      gated:      v.gated     ?? false,
      probs:      v.probs     ?? { buy: 0.33, hold: 0.34, sell: 0.33 },
      method:     v.method    ?? "rule_based",
    }));

    return NextResponse.json(
      {
        success:           true,
        timestamp:         snapshot.timestamp ?? new Date().toISOString(),
        predictions_count: snapshot.predictions_count ?? pairs.length,
        errors_count:      snapshot.errors_count ?? 0,
        pairs,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
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