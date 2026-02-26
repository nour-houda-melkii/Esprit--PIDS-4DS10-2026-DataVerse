// app/api/chat/route.ts
// Uses server-side keyword matching instead of Ollama tool calling
// This works 100% reliably with small models like llama3.2:1b

import { NextRequest, NextResponse } from "next/server"

// ─── Server-side intent detection ─────────────────────────────────────────────
// We don't rely on the model to call tools — we detect intent ourselves
// and pass structured actions back to the client alongside the text response.

interface Action {
  type: string
  payload: Record<string, any>
}

function detectActions(text: string): Action[] {
  const t = text.toLowerCase()
  const actions: Action[] = []

  // Navigation
  if (/\b(profile|my account|portfolios?)\b/.test(t) && !/show|display|stats/i.test(t))
    actions.push({ type:"navigate", payload:{ path:"/profile", reason:"User wants their profile" }})
  if (/\b(settings?|preferences?)\b/.test(t))
    actions.push({ type:"navigate", payload:{ path:"/settings", reason:"User wants settings" }})
  if (/\b(signals?\s*dashboard|go to signals?)\b/.test(t))
    actions.push({ type:"navigate", payload:{ path:"/signals", reason:"User wants signals dashboard" }})
  if (/\b(recommendations?|rec page)\b/.test(t))
    actions.push({ type:"navigate", payload:{ path:"/platform/recommendations", reason:"User wants recommendations" }})
  if (/\b(history|past trades?|trade history)\b/.test(t))
    actions.push({ type:"navigate", payload:{ path:"/platform/history", reason:"User wants history" }})

  // News feed filters
  if (/\b(crypto|bitcoin|btc|eth|ethereum|altcoin|blockchain)\b/.test(t))
    actions.push({ type:"filter_news_feed", payload:{ category:"crypto" }})
  else if (/\b(forex|fx|eur|usd|gbp|jpy|currency|currencies|exchange rate)\b/.test(t))
    actions.push({ type:"filter_news_feed", payload:{ category:"forex" }})
  else if (/\b(macro|fed|federal reserve|interest rate|inflation|gdp|cpi|central bank)\b/.test(t))
    actions.push({ type:"filter_news_feed", payload:{ category:"macro" }})
  else if (/\b(earnings?|revenue|quarterly|results?|eps)\b/.test(t))
    actions.push({ type:"filter_news_feed", payload:{ category:"earnings" }})
  else if (/\b(commodities|oil|gold|silver|natural gas|copper)\b/.test(t))
    actions.push({ type:"filter_news_feed", payload:{ category:"commodities" }})

  // Agent pages
  const agentMap: Record<string, string> = {
    macro: "macroeconomic", technical: "technical", sentiment: "sentiment",
    geopolitical: "geopolitical", "geo political": "geopolitical",
    correlation: "correlations", correlations: "correlations",
  }
  for (const [keyword, agentId] of Object.entries(agentMap)) {
    if (t.includes(keyword) && /\b(agent|explain|open|show|what is|how does)\b/.test(t)) {
      actions.push({ type:"explain_agent", payload:{ agentId }})
      break
    }
  }

  // Inline enrichments
  if (/\b(signal|trade setup|buy|sell|position|what to trade|entry|setup)\b/.test(t))
    actions.push({ type:"show_signal_cards", payload:{} })

  if (/\b(my portfolio|portfolio stats|my capital|my balance|my fund|how am i doing)\b/.test(t))
    actions.push({ type:"show_portfolio_stats", payload:{} })

  if (/\b(summarize|top story|latest article|top article|top news)\b/.test(t))
    actions.push({ type:"summarize_article", payload:{ topic: t.includes("crypto") ? "crypto" : "top" }})

  // Sign out
  if (/\b(sign out|log out|logout|signout)\b/.test(t))
    actions.push({ type:"navigate", payload:{ path:"/login", reason:"User wants to sign out" }})

  return actions
}

// ─── Ollama plain text call (no tools, just text) ──────────────────────────

async function callOllama(messages: { role: string; content: string }[]) {
  const url   = process.env.OLLAMA_URL   || "http://localhost:11434"
  const model = process.env.OLLAMA_MODEL || "llama3.2:1b"

  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      // NO tools — we handle actions ourselves
      options: { temperature: 0.75, num_predict: 512 },
    }),
  })

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data.message?.content || "").trim()
}

// ─── System prompt ─────────────────────────────────────────────────────────

const SYSTEM = `You are ARIA, an elite AI trading assistant for AlphaLab — a professional forex and crypto trading platform.

Personality: Sharp, confident, concise. Use trading terms naturally (pips, spreads, confluence, DXY, risk-off, carry trade). Max 3 sentences unless a deep explanation is needed. Dry wit when appropriate.

You can help with: forex/crypto market questions, trading strategies, explaining the platform's AI agents (macroeconomic, technical, sentiment, geopolitical, correlations), reading news, portfolio questions, and navigating the platform.

Platform has: a news feed (/platform/overview), AI signal previews, 5 AI trading agents, portfolio management, and trade history.

Important: Give direct, useful answers. Never say you "cannot access real-time data" — just give your best analysis.`

// ─── Route ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const lastUserMsg: string = messages.at(-1)?.content ?? ""

    // 1. Detect actions from user input (reliable, no LLM needed)
    const actions = detectActions(lastUserMsg)

    // 2. Get text response from Ollama (plain text, no tool calling)
    const history = messages.map((m: any) => ({
      role:    m.role,
      content: m.content,
    }))

    const content = await callOllama([
      { role: "system", content: SYSTEM },
      ...history,
    ])

    return NextResponse.json({ content, actions })

  } catch (err: any) {
    console.error("ARIA error:", err)

    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      return NextResponse.json({
        content: "⚠️ ARIA is offline. Open a terminal and run `ollama serve`, then try again.",
        actions: [],
      })
    }

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}