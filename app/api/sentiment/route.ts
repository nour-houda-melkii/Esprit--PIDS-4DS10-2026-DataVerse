import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const pair = searchParams.get("pair") || "EUR/USD"
  const apiUrl = process.env.SENTIMENT_API_URL
  if (!apiUrl) return NextResponse.json({ error: "SENTIMENT_API_URL not set" }, { status: 500 })
  const res  = await fetch(`${apiUrl}/predict?pair=${pair}`, { next: { revalidate: 300 } })
  const data = await res.json()
  return NextResponse.json(data)
}