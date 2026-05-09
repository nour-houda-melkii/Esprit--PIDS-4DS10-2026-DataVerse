import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || "stock market finance trading"
  const pageSize = searchParams.get("pageSize") || "20"

  const apiKey = process.env.NEWS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "NEWS_API_KEY is not configured" },
      { status: 500 }
    )
  }

  try {
    const url = new URL("https://newsapi.org/v2/everything")
    url.searchParams.set("q", query)
    url.searchParams.set("pageSize", pageSize)
    url.searchParams.set("language", "en")
    url.searchParams.set("sortBy", "publishedAt")
    url.searchParams.set("apiKey", apiKey)

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // cache for 5 minutes
    })

    if (!res.ok) {
      const error = await res.json()
      return NextResponse.json(
        { error: error.message || "Failed to fetch news" },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Normalize and clean articles
    const articles = (data.articles || [])
      .filter((a: any) => a.title && a.title !== "[Removed]")
      .map((a: any) => ({
        title: a.title,
        excerpt: a.description || "",
        source: a.source?.name || "Unknown",
        author: a.author || null,
        publishedAt: a.publishedAt,
        url: a.url,
        urlToImage: a.urlToImage || null,
        category: deriveCategory(a.title + " " + (a.description || "")),
      }))

    return NextResponse.json({ articles })
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function deriveCategory(text: string): string {
  const t = text.toLowerCase()
  if (t.includes("crypto") || t.includes("bitcoin") || t.includes("ethereum"))
    return "Crypto"
  if (t.includes("fed") || t.includes("interest rate") || t.includes("inflation"))
    return "Macro"
  if (t.includes("earnings") || t.includes("revenue") || t.includes("profit"))
    return "Earnings"
  if (t.includes("oil") || t.includes("gold") || t.includes("commodit"))
    return "Commodities"
  if (t.includes("forex") || t.includes("currency") || t.includes("dollar"))
    return "Forex"
  if (t.includes("ipo") || t.includes("merger") || t.includes("acquisition"))
    return "M&A"
  return "Markets"
}