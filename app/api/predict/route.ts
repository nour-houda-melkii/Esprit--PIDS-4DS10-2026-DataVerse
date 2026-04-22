
import { NextRequest, NextResponse } from "next/server";
 
// Server-side only — your real Azure / Render URL
const API_URL = process.env.API_URL ?? "";
 
export async function GET(req: NextRequest) {
  // If API_URL is not configured, return a clear error
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
 
  const backendUrl = `${API_URL}/predict?pair=${encodeURIComponent(pair)}&use_llm=${useLlm}`;
 
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // Cache each pair result for 60 seconds server-side
      // Avoids hammering your backend on every page refresh
      next: { revalidate: 60 },
    });
 
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}: ${text}` },
        { status: res.status }
      );
    }
 
    const data = await res.json();
 
    // Forward the response with CORS headers so the browser is happy
    return NextResponse.json(data, {
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
 
// Handle preflight CORS requests
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
