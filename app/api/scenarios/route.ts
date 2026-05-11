// app/api/scenarios/route.ts
import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://tokenfactory.esprit.tn/api"

const SYSTEM_PROMPT = `You are ARIA, an elite FX macro scenario analyst for AlphaLab.

Your task is to generate exactly 3 realistic macro scenarios for a given forex pair, based on current signal data.

You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation, no preamble.

The JSON must follow this exact structure:
{
  "scenarios": [
    {
      "id": "string (snake_case unique id)",
      "name": "string (short scenario name, max 4 words)",
      "emoji": "string (single relevant emoji)",
      "probability": number (integer 10-60, three scenarios must sum to ~100),
      "shockType": "bullish" | "bearish" | "neutral",
      "shockMagnitude": number (0.3 to 0.95),
      "description": "string (1 sentence, what happens and why)",
      "macroContext": "string (1 sentence, market-wide impact)",
      "triggerEvent": "string (specific event or data release that triggers this)",
      "pairEffects": {
        "EUR/USD": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) },
        "GBP/USD": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) },
        "USD/JPY": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) },
        "USD/CHF": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) },
        "EUR/GBP": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) },
        "GBP/JPY": { "direction": -1 | 0 | 1, "magnitude": number (0.1-0.99) }
      }
    }
  ]
}

Rules:
- direction: 1 = pair goes UP, -1 = pair goes DOWN, 0 = neutral/sideways
- magnitude: how strongly the scenario affects this pair (0.1 = minor, 0.99 = extreme)
- The three probabilities should roughly sum to 100
- Make scenarios realistic based on current macro environment (2024-2025)
- One scenario should align with the current signal (reinforcing), one should oppose it (risk), one should be neutral
- Use your deep knowledge of FX macro relationships (rate differentials, safe havens, carry trades, DXY correlations)
- ONLY output the JSON object, nothing else`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pair, signal, conviction, growth, price } = body

    const apiKey = process.env.TOKEN_FACTORY_API_KEY || ""

    const userPrompt = `Generate 3 macro scenarios for ${pair}.

Current data:
- Signal: ${signal}
- Conviction: ${conviction}%
- Expected move: ${growth > 0 ? "+" : ""}${growth}%
- Current price: ${price}

Consider the specific macro drivers for ${pair}:
- Which central banks are involved and their current stances
- Key economic data releases upcoming
- Current risk sentiment and safe-haven dynamics
- Rate differential and carry trade dynamics

Return the JSON scenarios now.`

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "hosted_vllm/Llama-3.1-70B-Instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userPrompt },
        ],
        temperature:       0.6,
        max_tokens:        1200,
        top_p:             0.9,
        frequency_penalty: 0.0,
        presence_penalty:  0.0,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LLM API ${res.status}: ${err}`)
    }

    const data = await res.json()
    let raw = (data.choices?.[0]?.message?.content ?? "").trim()

    // Strip markdown fences if the model wraps in ```json ... ```
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    raw = raw.replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()

    // Find the JSON object in the response
    const start = raw.indexOf("{")
    const end   = raw.lastIndexOf("}")
    if (start === -1 || end === -1) throw new Error("No JSON found in LLM response")
    raw = raw.slice(start, end + 1)

    const parsed = JSON.parse(raw)

    // Validate structure
    if (!parsed.scenarios || !Array.isArray(parsed.scenarios) || parsed.scenarios.length < 1) {
      throw new Error("Invalid scenario structure from LLM")
    }

    // Sanitize each scenario to ensure correct types
    const sanitized = parsed.scenarios.slice(0, 3).map((s: any, i: number) => ({
      id:             String(s.id || `scenario_${i}`),
      name:           String(s.name || `Scenario ${i + 1}`),
      emoji:          String(s.emoji || "📊"),
      probability:    Math.max(5, Math.min(70, Number(s.probability) || 33)),
      shockType:      ["bullish","bearish","neutral"].includes(s.shockType) ? s.shockType : "neutral",
      shockMagnitude: Math.max(0.1, Math.min(0.99, Number(s.shockMagnitude) || 0.5)),
      description:    String(s.description || ""),
      macroContext:   String(s.macroContext || ""),
      triggerEvent:   String(s.triggerEvent || ""),
      pairEffects: {
        "EUR/USD": sanitizeEffect(s.pairEffects?.["EUR/USD"]),
        "GBP/USD": sanitizeEffect(s.pairEffects?.["GBP/USD"]),
        "USD/JPY": sanitizeEffect(s.pairEffects?.["USD/JPY"]),
        "USD/CHF": sanitizeEffect(s.pairEffects?.["USD/CHF"]),
        "EUR/GBP": sanitizeEffect(s.pairEffects?.["EUR/GBP"]),
        "GBP/JPY": sanitizeEffect(s.pairEffects?.["GBP/JPY"]),
      },
    }))

    return NextResponse.json({ scenarios: sanitized, generated: true })

  } catch (err: any) {
    console.error("Scenarios API error:", err)
    return NextResponse.json(
      { error: err.message, generated: false },
      { status: 500 }
    )
  }
}

function sanitizeEffect(effect: any): { direction: -1 | 0 | 1; magnitude: number } {
  const dir = Number(effect?.direction ?? 0)
  return {
    direction: dir > 0 ? 1 : dir < 0 ? -1 : 0,
    magnitude: Math.max(0.1, Math.min(0.99, Number(effect?.magnitude) || 0.5)),
  }
}