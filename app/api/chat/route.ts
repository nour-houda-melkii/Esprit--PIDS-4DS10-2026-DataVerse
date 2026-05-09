// app/api/chat/route.ts  — ARIA v2 — Llama 3.1 70B via Token Factory API
import { NextRequest, NextResponse } from "next/server"

interface Action { type: string; payload: Record<string, any> }

// ─── Intent detection (server-side, no LLM needed) ────────────────────────────
function detectActions(text: string): Action[] {
  const t = text.toLowerCase()
  const a: Action[] = []

  // Navigation
  if (/\b(go to|take me|open|navigate|show me)\b.*(profile|account|portfolio)/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/profile" }})
  if (/\b(settings|preferences)\b/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/settings" }})
  if (/\b(recommendation|signal page|rec page)\b/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/platform/recommendations" }})
  if (/\b(news feed|market feed|overview)\b/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/platform/overview" }})
  if (/\b(history|past trades)\b/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/platform/history" }})

  // News filters
  if (/\b(crypto|bitcoin|btc|ethereum|eth)\b/i.test(t))
    a.push({ type:"filter_news_feed", payload:{ category:"crypto" }})
  else if (/\b(forex|fx|eur|usd|gbp|jpy|currency)\b/i.test(t))
    a.push({ type:"filter_news_feed", payload:{ category:"forex" }})
  else if (/\b(macro|fed|inflation|gdp|cpi|central bank|interest rate)\b/i.test(t))
    a.push({ type:"filter_news_feed", payload:{ category:"macro" }})

  // Agent explain
  const agents: Record<string,string> = {
    macro:"macroeconomic", technical:"technical", sentiment:"sentiment",
    geopolitical:"geopolitical", correlation:"correlations",
  }
  for (const [kw, id] of Object.entries(agents)) {
    if (t.includes(kw) && /\b(explain|how|what is|open|show|tell me about)\b/i.test(t)) {
      a.push({ type:"explain_agent", payload:{ agentId:id }}); break
    }
  }

  // Inline widgets
  if (/\b(signal|trade setup|buy|sell|entry|what to trade|best pair)\b/i.test(t))
    a.push({ type:"show_signal_cards", payload:{} })
  if (/\b(my portfolio|portfolio stats|my capital|my balance|how am i doing)\b/i.test(t))
    a.push({ type:"show_portfolio_stats", payload:{} })

  if (/\b(sign out|log out|logout)\b/i.test(t))
    a.push({ type:"navigate", payload:{ path:"/login" }})

  return a
}

// ─── Token Factory API call ───────────────────────────────────────────────────
async function callLlama(
  messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[],
  hasImage: boolean,
) {
  const apiKey   = process.env.TOKEN_FACTORY_API_KEY || ""
  console.log("ENV FULL:", process.env)
console.log("API KEY:", process.env.TOKEN_FACTORY_API_KEY)
  console.log("API KEY:", apiKey)
  const baseURL  = "https://tokenfactory.esprit.tn/api"
  // Use vision model if there's an image, otherwise use the big model
  const model    = hasImage
    ? "hosted_vllm/llava-1.5-7b-hf"
    : "hosted_vllm/Llama-3.1-70B-Instruct"

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature:       0.72,
      max_tokens:        1024,
      top_p:             0.9,
      frequency_penalty: 0.0,
      presence_penalty:  0.1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token Factory ${res.status}: ${err}`)
  }

  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? "").trim()
}

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_TEXT = `You are ARIA, an elite AI trading intelligence assistant for AlphaLab — a professional FX and crypto trading platform powered by a 5-agent AI system.

**Your personality:** Sharp, confident, direct. Use trading vocabulary naturally: pips, spreads, confluence, DXY, carry trade, risk-off, divergence, support/resistance, COT, institutional flows. Be concise — 2-3 sentences max unless a deep explanation is genuinely needed. Dry professional wit is fine.

**The platform's 5 AI agents:**
1. Macro Economics — interest rates, GDP, inflation, central bank policy (ECB, Fed, BoJ, BoE, SNB)
2. Technical Analysis — chart patterns, RSI, MACD, Bollinger Bands, support/resistance, volume
3. Geopolitical Risk — political events, safe-haven flows, intervention risk, crises
4. Correlations — DXY, US yields, VIX, cross-currency relationships, gold
5. Sentiment (LIVE) — real-time NLP ensemble of 5 ML models (DistilBERT, BiLSTM, TextCNN, LightGBM, LogReg) analysing financial news

**Central Brain:** A stacking meta-learner (Logistic Regression trained on model-weight priors) that combines all 5 agent votes into a final BUY/SELL/HOLD signal.

**6 Major pairs covered:** EUR/USD, GBP/USD, USD/JPY, USD/CHF, EUR/GBP, GBP/JPY

**Key platform sections:** /platform/overview (news feed), /platform/recommendations (agents + signals), /platform/history (trade log), /profile (portfolios), /settings

**Rules:**
- Never say "I cannot access real-time data" — give your best analysis
- When asked about a chart/image, provide detailed professional educational analysis
- Format responses with **bold** for key terms, use bullet points for multi-part answers
- Always answer in the same language the user writes in`

const SYSTEM_VISION = `You are ARIA, an expert trading chart analyst and financial educator.

When shown a trading chart or financial image, provide a detailed educational analysis covering:
1. **Chart type & timeframe** (if visible)
2. **Price action** — current trend, key moves, structure
3. **Key levels** — support, resistance, important price zones
4. **Technical indicators** (if visible) — RSI, MACD, moving averages, Bollinger Bands, volume
5. **Patterns** — candlestick patterns, chart patterns (head & shoulders, flags, wedges, etc.)
6. **Trading opportunity** — potential setup, entry, stop loss, take profit levels
7. **Risk assessment** — what could invalidate this setup

Be thorough and educational. Format with clear sections. Use professional trading terminology.
Always end with: "⚠️ This is educational analysis only, not financial advice."`

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, imageData } = body   // imageData: base64 string or null

    const lastUserMsg: string = typeof messages.at(-1)?.content === "string"
      ? messages.at(-1).content
      : ""

    const actions = detectActions(lastUserMsg)
    const hasImage = !!imageData

    // Build messages for the LLM
    let llmMessages: any[]

    if (hasImage) {
      // Vision mode — use llava with multimodal message
      llmMessages = [
        { role: "system", content: SYSTEM_VISION },
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : m.content,
        })),
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageData } },
            { type: "text", text: lastUserMsg || "Please analyse this chart in detail." },
          ],
        },
      ]
    } else {
      // Text mode — standard Llama 70B
      llmMessages = [
        { role: "system", content: SYSTEM_TEXT },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ]
    }

    const content = await callLlama(llmMessages, hasImage)

    return NextResponse.json({
      content,
      actions,
      model: hasImage ? "llava-1.5-7b" : "llama-3.1-70b",
      hasImage,
    })

  } catch (err: any) {
    console.error("ARIA v2 error:", err)

    const isConnError = err.message?.includes("ECONNREFUSED")
      || err.message?.includes("fetch failed")
      || err.message?.includes("network")

    return NextResponse.json({
      content: isConnError
        ? "⚠️ Cannot reach the Token Factory API. Check your `TOKEN_FACTORY_API_KEY` in `.env.local` and your network connection."
        : `⚠️ Error: ${err.message}`,
      actions: [],
    })
  }
}