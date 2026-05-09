"use client"
// components/chatbot/chatbot.tsx  —  ARIA v2
// Features:
//  - Token Factory API (Llama 3.1 70B + LLaVA 1.5 7B for images)
//  - Image upload: drag-drop or click, expands chatbot to 80% screen for analysis
//  - Text-to-speech output (Web Speech API)
//  - Voice input (Web Speech API)
//  - Wake word detection (pass-through to useWakeWord hook)
//  - Navigation actions, signal cards, quick replies
//  - Streaming-style typewriter animation
//  - Markdown rendering (bold, italic, code, bullet points, headers)

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import { useChatbot } from "@/components/chatbot/chatbot-provider"
import { useWakeWord } from "@/hooks/use-wake-word"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Action { type: string; payload: Record<string, any> }

interface SignalCard {
  pair: string; signal: "BUY" | "SELL" | "HOLD"
  conviction: number; reason: string
}

interface QuickReply { label: string; message: string }

interface Message {
  id:            string
  role:          "user" | "assistant"
  content:       string
  streaming:     boolean
  actions?:      Action[]
  signalCards?:  SignalCard[]
  quickReplies?: QuickReply[]
  timestamp:     Date
  imageUrl?:     string   // base64 data URL for user-uploaded images
  model?:        string   // which model responded
  isImageAnalysis?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SUGGESTIONS: Record<string, QuickReply[]> = {
  "/platform/overview": [
    { label:"💱 Forex news",   message:"Filter the feed for forex news"        },
    { label:"📈 Macro news",   message:"Show me macro economic news"            },
    { label:"₿ Crypto news",  message:"Show me crypto news"                    },
    { label:"📝 Top story",    message:"Summarize the top market article"       },
  ],
  "/platform/recommendations": [
    { label:"📊 Best signal",  message:"What is the highest conviction trade right now?" },
    { label:"🤖 How it works", message:"Explain how the 5-agent AI system works"         },
    { label:"🎯 EUR/USD",      message:"Explain the EUR/USD signal in detail"             },
    { label:"⚠️ Top risk",    message:"What is the biggest risk to watch this week?"      },
  ],
  "/profile": [
    { label:"💼 Portfolio",    message:"Show me my portfolio stats"             },
    { label:"⚖️ Risk",        message:"What is my overall risk exposure?"       },
  ],
  default: [
    { label:"📊 Signals",      message:"Show me the live trading signals"       },
    { label:"🤖 Agents",       message:"Explain the 5 AI agents"               },
    { label:"💱 Carry trade",  message:"What is a carry trade and why use it?"  },
    { label:"📈 Upload chart", message:"How do I upload a chart for analysis?"  },
    { label:"🌍 DXY impact",   message:"How does DXY affect forex pairs?"       },
  ],
}

const SIGNALS: SignalCard[] = [
  { pair:"EUR/USD", signal:"BUY",  conviction:74, reason:"Bullish RSI divergence on 4H. ECB pivot only 60% priced in." },
  { pair:"GBP/JPY", signal:"BUY",  conviction:78, reason:"3-week uptrend structure intact. 535bp carry premium." },
  { pair:"USD/JPY", signal:"BUY",  conviction:82, reason:"Breakout above 151.00 on volume. Record US-Japan rate gap." },
  { pair:"GBP/USD", signal:"SELL", conviction:68, reason:"Bearish engulfing at 1.2750 resistance. BoE early cut risk." },
]

const MODEL_LABELS: Record<string, string> = {
  "llama-3.1-70b": "Llama 3.1 70B",
  "llava-1.5-7b":  "LLaVA 1.5 7B · Vision",
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, "<h3 style='font-size:12px;font-weight:700;color:#a8d4ff;margin:8px 0 4px;letter-spacing:.03em'>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2 style='font-size:13px;font-weight:700;color:#c8e3ff;margin:10px 0 5px'>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1 style='font-size:14px;font-weight:800;color:#e0efff;margin:10px 0 6px'>$1</h1>")
    // Bold + italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong style='color:#c8e3ff;font-weight:700'><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g,     "<strong style='color:#a8d4ff;font-weight:600'>$1</strong>")
    .replace(/\*(.*?)\*/g,         "<em style='color:rgba(255,255,255,.55)'>$1</em>")
    // Inline code
    .replace(/`(.*?)`/g, "<code style='background:rgba(100,200,255,.1);border:1px solid rgba(100,200,255,.18);border-radius:4px;padding:1px 6px;font-family:\"DM Mono\",monospace;font-size:10.5px;color:#7dd3fc'>$1</code>")
    // Bullet points (- or *)
    .replace(/^[\-\*]\s+(.+)$/gm, "<div style='display:flex;gap:7px;margin:2px 0'><span style='color:rgba(100,180,255,.5);flex-shrink:0;margin-top:1px'>▸</span><span>$1</span></div>")
    // Numbered lists
    .replace(/^(\d+)\.\s+(.+)$/gm, "<div style='display:flex;gap:7px;margin:2px 0'><span style='color:rgba(100,180,255,.5);flex-shrink:0;font-family:\"DM Mono\",monospace;font-size:10px;margin-top:2px'>$1.</span><span>$2</span></div>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr style='border:none;border-top:1px solid rgba(255,255,255,.08);margin:8px 0'>")
    // Warning emoji lines
    .replace(/^⚠️(.+)$/gm, "<div style='background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.18);border-radius:8px;padding:6px 9px;margin:6px 0;font-size:11px;color:rgba(245,220,130,.8)'>⚠️$1</div>")
}

// ─── StreamText ───────────────────────────────────────────────────────────────
function StreamText({ text, active, speed = 8, onDone }: {
  text: string; active: boolean; speed?: number; onDone?: () => void
}) {
  const [shown, setShown] = useState(active ? "" : text)
  const ref = useRef(0)

  useEffect(() => {
    if (!active) { setShown(text); onDone?.(); return }
    ref.current = 0; setShown("")
    const iv = setInterval(() => {
      ref.current = Math.min(ref.current + 3, text.length)
      setShown(text.slice(0, ref.current))
      if (ref.current >= text.length) { clearInterval(iv); onDone?.() }
    }, speed)
    return () => clearInterval(iv)
  }, [text, active]) // eslint-disable-line

  const html = useMemo(() => renderMarkdown(shown), [shown])

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
      {shown.split("\n").map((line, i) => {
        const lineHtml = renderMarkdown(line)
        return (
          <div key={i} style={{ lineHeight:1.65 }}
            dangerouslySetInnerHTML={{ __html: lineHtml || "&nbsp;" }} />
        )
      })}
      {active && shown.length < text.length && (
        <span style={{ display:"inline-block", width:2, height:13, background:"#7dd3fc", borderRadius:1, marginLeft:2, verticalAlign:"middle", animation:"ariaCursor .7s ease-in-out infinite" }} />
      )}
    </div>
  )
}

// ─── Signal card ──────────────────────────────────────────────────────────────
function SignalCardUI({ card }: { card: SignalCard }) {
  const cfg = {
    BUY:  { bg:"rgba(16,185,129,.08)",  border:"rgba(16,185,129,.22)",  color:"#10b981", lbl:"▲ BUY"  },
    SELL: { bg:"rgba(244,63,94,.08)",   border:"rgba(244,63,94,.22)",   color:"#f43f5e", lbl:"▼ SELL" },
    HOLD: { bg:"rgba(245,158,11,.08)",  border:"rgba(245,158,11,.22)",  color:"#f59e0b", lbl:"● HOLD" },
  }[card.signal]
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:11, padding:"9px 12px", marginBottom:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:"#fff", letterSpacing:".04em" }}>{card.pair}</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color:cfg.color, letterSpacing:".1em" }}>{cfg.lbl}</span>
      </div>
      <div style={{ marginBottom:5 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.3)", marginBottom:3 }}>
          <span>CONVICTION</span><span style={{ color:"#fff", fontWeight:600 }}>{card.conviction}%</span>
        </div>
        <div style={{ height:3, background:"rgba(255,255,255,.07)", borderRadius:2 }}>
          <div style={{ height:"100%", width:`${card.conviction}%`, background:cfg.color, borderRadius:2 }} />
        </div>
      </div>
      <p style={{ fontSize:10.5, color:"rgba(255,255,255,.42)", margin:0, lineHeight:1.5 }}>{card.reason}</p>
    </div>
  )
}

// ─── Image preview thumbnail ──────────────────────────────────────────────────
function ImageThumb({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor:"pointer", marginTop:7, borderRadius:10, overflow:"hidden", border:"1px solid rgba(100,180,255,.2)", maxWidth:200 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="uploaded chart" style={{ width:"100%", display:"block", maxHeight:140, objectFit:"cover" }} />
      <div style={{ padding:"4px 8px", background:"rgba(100,180,255,.06)", fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.5)", letterSpacing:".06em" }}>
        📊 CHART UPLOADED · CLICK TO EXPAND
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({
  msg, onQuickReply, onSpeakToggle, speaking, onImageExpand,
}: {
  msg: Message
  onQuickReply: (t: string) => void
  onSpeakToggle: (text: string, id: string) => void
  speaking: string | null
  onImageExpand: (src: string, caption: string) => void
}) {
  const [streamDone, setStreamDone] = useState(!msg.streaming)
  const isA = msg.role === "assistant"
  const isSpeaking = speaking === msg.id

  return (
    <div style={{ display:"flex", gap:8, flexDirection:isA?"row":"row-reverse", animation:"ariaIn .22s ease forwards" }}>
      {/* Avatar */}
      <div style={{
        width:28, height:28, borderRadius:9, flexShrink:0, marginTop:2,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isA ? "linear-gradient(135deg,rgba(100,180,255,.15),rgba(60,100,255,.28))" : "rgba(255,255,255,.06)",
        border: isA ? "1px solid rgba(100,180,255,.2)" : "1px solid rgba(255,255,255,.08)",
        fontSize:8, fontWeight:700, fontFamily:"'DM Mono',monospace",
        color: isA ? "#a8d4ff" : "rgba(255,255,255,.35)", letterSpacing:".05em",
      }}>
        {isA ? "AR" : "ME"}
      </div>

      {/* Content */}
      <div style={{ maxWidth:"84%", display:"flex", flexDirection:"column", alignItems:isA?"flex-start":"flex-end", minWidth:0 }}>
        {/* User image (above bubble) */}
        {msg.imageUrl && !isA && (
          <ImageThumb src={msg.imageUrl} onClick={() => onImageExpand(msg.imageUrl!, "Your uploaded chart")} />
        )}

        {/* Bubble */}
        <div style={{
          padding:"10px 14px", borderRadius:15,
          background: isA
            ? msg.isImageAnalysis
              ? "linear-gradient(135deg,rgba(100,80,255,.08),rgba(40,20,120,.12))"
              : "rgba(255,255,255,.04)"
            : "linear-gradient(135deg,rgba(60,130,255,.18),rgba(30,60,200,.14))",
          border: isA
            ? msg.isImageAnalysis
              ? "1px solid rgba(140,100,255,.18)"
              : "1px solid rgba(255,255,255,.07)"
            : "1px solid rgba(100,160,255,.18)",
          borderTopLeftRadius: isA ? 3 : 15,
          borderTopRightRadius: isA ? 15 : 3,
          backdropFilter: "blur(12px)",
          fontSize: 12.5,
          color: "rgba(255,255,255,.87)",
          wordBreak: "break-word",
          maxWidth: "100%",
        }}>
          {/* Image analysis badge */}
          {msg.isImageAnalysis && (
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8, padding:"3px 8px", background:"rgba(140,100,255,.1)", border:"1px solid rgba(140,100,255,.2)", borderRadius:20, width:"fit-content", fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(180,150,255,.7)", letterSpacing:".07em" }}>
              <span>📊</span> CHART ANALYSIS · LLAVA VISION MODEL
            </div>
          )}

          <StreamText text={msg.content} active={msg.streaming} onDone={() => setStreamDone(true)} />

          {/* Signal cards */}
          {msg.signalCards && msg.signalCards.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:8.5, fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.22)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:7 }}>▸ LIVE AGENT SIGNALS</div>
              {msg.signalCards.map((c,i) => <SignalCardUI key={i} card={c}/>)}
            </div>
          )}

          {/* Action badges */}
          {msg.actions && msg.actions.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
              {msg.actions.map((a,i) => (
                <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:20, background:"rgba(16,185,129,.07)", border:"1px solid rgba(16,185,129,.18)", fontSize:9.5, fontFamily:"'DM Mono',monospace", color:"#10b981" }}>
                  ✓ {a.type.replace(/_/g," ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick replies */}
        {streamDone && msg.quickReplies && msg.quickReplies.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
            {msg.quickReplies.map((qr,i) => (
              <button key={i} onClick={() => onQuickReply(qr.message)} style={{
                padding:"5px 11px", borderRadius:20, cursor:"pointer",
                background:"rgba(100,180,255,.06)", border:"1px solid rgba(100,180,255,.14)",
                fontSize:10.5, color:"rgba(140,200,255,.8)", fontFamily:"'DM Mono',monospace",
                transition:"all .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(100,180,255,.14)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(100,180,255,.3)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="rgba(100,180,255,.06)"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(100,180,255,.14)" }}
              >{qr.label}</button>
            ))}
          </div>
        )}

        {/* Footer: timestamp + model + TTS */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, paddingInline:2 }}>
          <span style={{ fontSize:8.5, color:"rgba(255,255,255,.14)", fontFamily:"'DM Mono',monospace" }}>
            {msg.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </span>
          {msg.model && (
            <span style={{ fontSize:8, color:"rgba(100,180,255,.22)", fontFamily:"'DM Mono',monospace", letterSpacing:".04em" }}>
              {MODEL_LABELS[msg.model] ?? msg.model}
            </span>
          )}
          {isA && streamDone && msg.content.length > 20 && (
            <button
              onClick={() => onSpeakToggle(msg.content, msg.id)}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0, color: isSpeaking ? "#a8d4ff" : "rgba(255,255,255,.18)", transition:"color .15s" }}
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Image expand overlay ─────────────────────────────────────────────────────
function ImageOverlay({ src, caption, onClose }: { src: string; caption: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:100000,
        background:"rgba(3,6,16,.92)", backdropFilter:"blur(20px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        animation:"ariaFadeIn .2s ease forwards", padding:24,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"90vh", display:"flex", flexDirection:"column", gap:12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption}
          style={{ maxWidth:"100%", maxHeight:"80vh", objectFit:"contain", borderRadius:16, border:"1px solid rgba(100,180,255,.18)", boxShadow:"0 32px 80px rgba(0,0,0,.8)" }}
        />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.45)", letterSpacing:".06em" }}>{caption}</span>
          <button onClick={onClose} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(100,180,255,.1)", border:"1px solid rgba(100,180,255,.2)", color:"#a8d4ff", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>
            ESC · CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drop zone overlay ────────────────────────────────────────────────────────
function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:50, borderRadius:24,
      background:"rgba(60,100,255,.12)", backdropFilter:"blur(4px)",
      border:"2px dashed rgba(100,180,255,.5)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10,
      pointerEvents:"none",
    }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(100,180,255,.7)" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.7)", letterSpacing:".06em" }}>DROP TO ANALYSE CHART</span>
    </div>
  )
}

// ─── Wake toast ───────────────────────────────────────────────────────────────
function WakeToast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position:"fixed", top:24, left:"50%", transform:"translateX(-50%)",
      background:"rgba(6,10,22,.95)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(100,180,255,.25)", borderRadius:40,
      padding:"10px 20px", display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 8px 32px rgba(0,0,0,.6)", zIndex:100000,
      animation:"ariaToastIn .3s cubic-bezier(.34,1.4,.64,1) forwards", whiteSpace:"nowrap",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:2.5 }}>
        {[1,1.6,.8,1.4,.9,1.2,1.5].map((h,i) => (
          <div key={i} style={{ width:3, height:14*h, borderRadius:2, background:"#a8d4ff", animation:`ariaWave .8s ease-in-out ${i*.1}s infinite alternate` }} />
        ))}
      </div>
      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.75)", letterSpacing:".06em" }}>
        ARIA is listening…
      </span>
      <div style={{ width:7, height:7, background:"#00e676", borderRadius:"50%", boxShadow:"0 0 8px rgba(0,230,118,.7)", animation:"ariaDotPing 1s ease-in-out infinite" }} />
    </div>
  )
}

// ─── Main Chatbot component ───────────────────────────────────────────────────
export function Chatbot() {
  const router   = useRouter()
  const pathname = usePathname()
  const { dispatch } = useChatbot()

  const [isOpen,       setIsOpen]       = useState(false)
  const [isMin,        setIsMin]        = useState(false)
  const [isExpanded,   setIsExpanded]   = useState(false)  // 80% screen for image analysis
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState("")
  const [isLoading,    setIsLoading]    = useState(false)
  const [pulse,        setPulse]        = useState(true)
  const [listening,    setListening]    = useState(false)
  const [wakeEnabled,  setWakeEnabled]  = useState(false)
  const [wakeToast,    setWakeToast]    = useState(false)
  const [speaking,     setSpeaking]     = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<string | null>(null)  // base64 data URL
  const [isDragging,   setIsDragging]   = useState(false)
  const [overlay,      setOverlay]      = useState<{ src: string; caption: string } | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const voiceRef   = useRef<any>(null)
  const synthRef   = useRef<SpeechSynthesisUtterance | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Wake word ─────────────────────────────────────────────────────────────
  const handleWake = useCallback(() => {
    setWakeToast(true); setIsOpen(true); setIsMin(false)
    setTimeout(() => setWakeToast(false), 4000)
  }, [])

  const handleWakeCommand = useCallback((text: string) => {
    setWakeToast(false); setInput(text)
    setTimeout(() => sendMessage(text), 400)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { supported: wakeSupported, active: wakeActive } = useWakeWord({
    onWake: handleWake, onCommand: handleWakeCommand, enabled: wakeEnabled,
  })

  // ── Welcome message ───────────────────────────────────────────────────────
  useEffect(() => {
    const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
    const names: Record<string,string> = {
      "/platform/overview":        "the **Market Feed**",
      "/platform/recommendations": "**Recommendations**",
      "/profile":                  "your **Profile**",
    }
    const where = names[pathname] ?? "**AlphaLab**"
    setMessages([{
      id:"welcome", role:"assistant",
      content:`I'm **ARIA**, your trading intelligence assistant — powered by **Llama 3.1 70B**.\nYou're on ${where}.\n\n📊 *Tip: Upload a trading chart and I'll give you a detailed professional analysis.*`,
      streaming:true, quickReplies:suggs, timestamp:new Date(),
      model:"llama-3.1-70b",
    }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => { const t = setTimeout(() => setPulse(false), 8000); return () => clearTimeout(t) }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages, isLoading])
  useEffect(() => { if (isOpen && !isMin) setTimeout(() => inputRef.current?.focus(), 280) }, [isOpen, isMin])

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, id: string) => {
    if (!("speechSynthesis" in window)) return
    // Strip markdown for TTS
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/^#+\s+/gm, "")
      .replace(/▸/g, "")
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = "en-US"; utt.rate = 1.0; utt.pitch = 1.0
    utt.onend = () => setSpeaking(null)
    utt.onerror = () => setSpeaking(null)
    synthRef.current = utt
    window.speechSynthesis.speak(utt)
    setSpeaking(id)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(null)
  }, [])

  const handleSpeakToggle = useCallback((text: string, id: string) => {
    if (speaking === id) { stopSpeaking(); return }
    stopSpeaking()
    setTimeout(() => speak(text, id), 100)
  }, [speaking, speak, stopSpeaking])

  // ── Image handling ────────────────────────────────────────────────────────
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPendingImage(dataUrl)
      setIsExpanded(true)  // expand for image mode
      inputRef.current?.focus()
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processImageFile(f)
    e.target.value = ""
  }, [processImageFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processImageFile(f)
  }, [processImageFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const removePendingImage = useCallback(() => {
    setPendingImage(null)
    setIsExpanded(false)
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  const executeActions = useCallback((actions: Action[]) => {
    for (const a of actions) {
      switch (a.type) {
        case "navigate":            router.push(a.payload.path); dispatch({ type:"navigate",            payload:a.payload as any }); break
        case "filter_news_feed":    router.push("/platform/overview"); dispatch({ type:"filter_news_feed",    payload:a.payload as any }); break
        case "explain_agent":       router.push(`/agents/${a.payload.agentId}`); dispatch({ type:"explain_agent",       payload:a.payload as any }); break
        case "highlight_portfolio": router.push("/profile"); dispatch({ type:"highlight_portfolio", payload:a.payload as any }); break
      }
    }
  }, [router, dispatch])

  // ── Voice input ───────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert("Voice input requires Chrome or Edge."); return }
    const r = new SR(); r.lang = "en-US"; r.interimResults = false
    r.onstart  = () => setListening(true)
    r.onend    = () => setListening(false)
    r.onerror  = () => setListening(false)
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript
      setInput(t)
      setTimeout(() => sendMessage(t), 150)
    }
    voiceRef.current = r; r.start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopVoice = useCallback(() => { voiceRef.current?.stop(); setListening(false) }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, imageDataOverride?: string) => {
    const clean = text.trim()
    if (!clean && !pendingImage && !imageDataOverride) return
    if (isLoading) return

    const imgToSend = imageDataOverride ?? pendingImage
    const isImg = !!imgToSend

    const userMsg: Message = {
      id:       Date.now().toString(),
      role:     "user",
      content:  clean || "Please analyse this chart in detail.",
      streaming:false,
      timestamp:new Date(),
      imageUrl: imgToSend ?? undefined,
    }

    const history = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setPendingImage(null)
    setIsLoading(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role:"user", content: clean || "Analyse this chart." }],
          imageData: imgToSend ?? null,
        }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (data.actions?.length > 0) executeActions(data.actions)

      const lower    = clean.toLowerCase()
      const wantsSignals = data.actions?.some((a: Action) => a.type === "show_signal_cards")
        || /\b(signal|trade setup|what to trade|best pair|entry)\b/.test(lower)

      const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
      const qr: QuickReply[] = []
      if (wantsSignals)                         qr.push({ label:"📊 Dashboard",  message:"Take me to the recommendations page"   })
      if (/portfolio|capital/i.test(lower))     qr.push({ label:"✏️ Edit",       message:"Take me to my profile"                })
      if (/news|article|feed/i.test(lower))     qr.push({ label:"📰 More",       message:"Show me more market news"              })
      if (/agent/i.test(lower))                 qr.push({ label:"🤖 Agents",     message:"Explain each AI agent in detail"       })
      if (isImg)                                qr.push({ label:"🔍 Zoom",       message:"What is the most critical level on this chart?" })
      if (qr.length === 0)                      qr.push(...suggs.slice(0, 3))

      // If image was analysed, keep expanded
      if (isImg) setIsExpanded(true)

      setMessages(prev => [...prev, {
        id:          (Date.now() + 1).toString(),
        role:        "assistant",
        content:     data.content || "I couldn't generate a response. Try again.",
        streaming:   true,
        actions:     data.actions?.length > 0 ? data.actions : undefined,
        signalCards: wantsSignals ? SIGNALS : undefined,
        quickReplies:qr,
        timestamp:   new Date(),
        model:       data.model,
        isImageAnalysis: isImg,
      }])
    } catch (err: any) {
      if (err.name === "AbortError") return
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role:"assistant",
        content: "⚠️ ARIA is offline. Check your `TOKEN_FACTORY_API_KEY` in `.env.local`.",
        streaming:true, timestamp:new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, pendingImage, executeActions, pathname])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const clearChat = () => {
    stopSpeaking()
    const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
    setMessages([{ id:"welcome", role:"assistant", content:"Chat cleared. What do you need?", streaming:true, quickReplies:suggs, timestamp:new Date(), model:"llama-3.1-70b" }])
    setPendingImage(null); setIsExpanded(false)
  }

  const toggleExpand = () => setIsExpanded(v => !v)

  // ── Computed panel size ───────────────────────────────────────────────────
  const panelStyle = useMemo(() => {
    if (isExpanded) {
      return {
        position: "fixed" as const,
        top:      "5vh",
        right:    "2vw",
        width:    "min(900px, 96vw)",
        height:   "90vh",
        bottom:   "auto",
        borderRadius: 26,
      }
    }
    return {
      position: "absolute" as const,
      bottom:   72,
      right:    0,
      width:    400,
      height:   "auto",
      maxHeight:"calc(100vh - 120px)",
      borderRadius: 24,
    }
  }, [isExpanded])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .aria-root { position:fixed; bottom:28px; right:28px; z-index:9999; font-family:'Plus Jakarta Sans',sans-serif; }

        .aria-fab {
          width:58px; height:58px; border-radius:18px; border:none; cursor:pointer;
          position:relative; display:flex; align-items:center; justify-content:center;
          background:rgba(7,12,26,.94); backdrop-filter:blur(20px);
          box-shadow:0 0 0 1px rgba(100,180,255,.14),0 8px 32px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.07);
          transition:transform .2s,box-shadow .2s; overflow:hidden;
        }
        .aria-fab-glow { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(100,180,255,.14),rgba(60,100,255,.09),rgba(120,60,255,.07));animation:ariaHue 8s linear infinite; }
        @keyframes ariaHue{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}
        .aria-fab:hover { transform:scale(1.06) translateY(-2px);box-shadow:0 0 0 1px rgba(100,180,255,.26),0 16px 48px rgba(0,0,0,.7),0 0 40px rgba(60,100,255,.1),inset 0 1px 0 rgba(255,255,255,.09); }
        .aria-fab.pulse::after { content:'';position:absolute;inset:-4px;border-radius:22px;border:1.5px solid rgba(100,180,255,.32);animation:ariaPulseRing 2.2s ease-out infinite; }
        @keyframes ariaPulseRing{0%{transform:scale(1);opacity:1}100%{transform:scale(1.55);opacity:0}}
        .aria-fab-icon { position:relative;z-index:1; }
        .aria-fab-dot { position:absolute;top:9px;right:9px;width:9px;height:9px;background:#10b981;border-radius:50%;border:1.5px solid rgba(0,0,0,.35);z-index:2;box-shadow:0 0 6px rgba(16,185,129,.6);animation:ariaDotPing 2s ease-in-out infinite; }
        .aria-fab-dot.wake { background:#a8d4ff;box-shadow:0 0 10px rgba(100,180,255,.8);animation:ariaWakeDot .5s ease-in-out infinite alternate; }
        @keyframes ariaWakeDot{from{transform:scale(1)}to{transform:scale(1.4)}}
        @keyframes ariaDotPing{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 0 0 4px rgba(16,185,129,0)}}

        .aria-panel {
          background:rgba(6,10,20,.92);backdrop-filter:blur(52px) saturate(180%);
          overflow:hidden;border:1px solid rgba(255,255,255,.07);
          box-shadow:0 0 0 1px rgba(100,180,255,.04),0 48px 96px rgba(0,0,0,.88),0 0 80px rgba(40,80,200,.07);
          display:flex;flex-direction:column;
          transform-origin:bottom right;
          transition: width .35s cubic-bezier(.34,1.2,.64,1),height .35s cubic-bezier(.34,1.2,.64,1),top .35s cubic-bezier(.34,1.2,.64,1),right .35s cubic-bezier(.34,1.2,.64,1);
        }
        .aria-panel.first-open { animation:ariaSlide .3s cubic-bezier(.34,1.4,.64,1) forwards; }
        @keyframes ariaSlide{from{transform:scale(.86) translateY(14px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes ariaFadeIn{from{opacity:0}to{opacity:1}}

        .aria-head { padding:14px 18px 12px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:11px;background:linear-gradient(180deg,rgba(100,180,255,.04) 0%,transparent 100%); }
        .aria-av { width:36px;height:36px;border-radius:11px;flex-shrink:0;background:linear-gradient(135deg,rgba(100,180,255,.14),rgba(60,100,255,.24));border:1px solid rgba(100,180,255,.18);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:#a8d4ff;letter-spacing:.05em; }
        .aria-hname { font-size:14px;font-weight:800;color:#fff;letter-spacing:.01em; }
        .aria-hstatus { font-size:9px;color:rgba(100,180,255,.5);font-family:'DM Mono',monospace;display:flex;align-items:center;gap:4px;margin-top:1.5px;letter-spacing:.05em; }
        .aria-hdot { width:5px;height:5px;background:#10b981;border-radius:50%;box-shadow:0 0 5px rgba(16,185,129,.5);animation:ariaDotPing 2s ease-in-out infinite; }
        .aria-hbtns { margin-left:auto;display:flex;gap:4px; }
        .aria-hbtn { width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.28);transition:all .15s; }
        .aria-hbtn:hover { background:rgba(255,255,255,.08);color:rgba(255,255,255,.65);border-color:rgba(255,255,255,.1); }
        .aria-hbtn.active { background:rgba(100,180,255,.1);border-color:rgba(100,180,255,.25);color:#a8d4ff; }

        .aria-ctx { padding:5px 18px;flex-shrink:0;background:rgba(100,180,255,.025);border-bottom:1px solid rgba(100,180,255,.05);font-size:8.5px;font-family:'DM Mono',monospace;color:rgba(100,180,255,.35);display:flex;align-items:center;gap:5px;letter-spacing:.07em;text-transform:uppercase; }

        .aria-msgs { flex:1;overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;gap:13px;min-height:0; }
        .aria-msgs::-webkit-scrollbar{width:3px;}
        .aria-msgs::-webkit-scrollbar-thumb{background:rgba(100,180,255,.1);border-radius:2px;}

        @keyframes ariaIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ariaCursor{0%,100%{opacity:1}50%{opacity:0}}

        .aria-typing { display:flex;align-items:center;gap:5px;padding:10px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;border-top-left-radius:3px;width:fit-content;flex-shrink:0; }
        .aria-d { width:5px;height:5px;border-radius:50%;background:rgba(100,180,255,.45);animation:ariaB 1.2s ease-in-out infinite; }
        .aria-d:nth-child(2){animation-delay:.22s}.aria-d:nth-child(3){animation-delay:.44s}
        @keyframes ariaB{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}

        /* Image preview bar */
        .aria-imgbar { padding:8px 14px;flex-shrink:0;border-top:1px solid rgba(100,180,255,.08);background:rgba(60,40,200,.05);display:flex;align-items:center;gap:8px; }

        .aria-iarea { padding:10px 14px 14px;flex-shrink:0;border-top:1px solid rgba(255,255,255,.05);display:flex;gap:6px;align-items:flex-end;background:rgba(6,10,20,.6);position:relative; }
        .aria-iwrap { flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;overflow:hidden;transition:border-color .2s,box-shadow .2s; }
        .aria-iwrap:focus-within { border-color:rgba(100,180,255,.28);box-shadow:0 0 0 3px rgba(100,180,255,.05); }
        .aria-ta { width:100%;background:transparent;border:none;outline:none;padding:10px 12px;font-size:13px;color:rgba(255,255,255,.87);font-family:'Plus Jakarta Sans',sans-serif;resize:none;min-height:40px;max-height:100px;line-height:1.5;display:block; }
        .aria-ta::placeholder { color:rgba(255,255,255,.16); }
        .aria-btn { width:40px;height:40px;border-radius:12px;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .18s; }
        .aria-send { background:linear-gradient(135deg,rgba(100,180,255,.2),rgba(60,100,255,.3));border:1px solid rgba(100,180,255,.22);color:#a8d4ff; }
        .aria-send:hover:not(:disabled) { background:linear-gradient(135deg,rgba(100,180,255,.32),rgba(60,100,255,.42));transform:scale(1.06);box-shadow:0 4px 16px rgba(60,100,255,.22); }
        .aria-send:disabled { opacity:.28;cursor:not-allowed; }
        .aria-voice { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.32); }
        .aria-voice:hover { background:rgba(255,255,255,.08);color:rgba(255,255,255,.6); }
        .aria-voice.on { background:rgba(244,63,94,.12);border-color:rgba(244,63,94,.25);color:#f43f5e;animation:ariaVoice .8s ease-in-out infinite; }
        @keyframes ariaVoice{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.25)}50%{box-shadow:0 0 0 5px rgba(244,63,94,0)}}
        .aria-imgbtn { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.32); }
        .aria-imgbtn:hover { background:rgba(100,180,255,.08);border-color:rgba(100,180,255,.2);color:#a8d4ff; }
        .aria-imgbtn.has-img { background:rgba(140,80,255,.1);border-color:rgba(140,80,255,.25);color:#c4a1ff; }

        .aria-foot { padding:5px 16px 9px;flex-shrink:0;text-align:center;font-size:8px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.1);letter-spacing:.08em;text-transform:uppercase; }
        .aria-foot span { color:rgba(100,180,255,.28); }

        .aria-mini { position:absolute;bottom:70px;right:0;cursor:pointer;background:rgba(6,10,20,.94);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:9px 15px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 32px rgba(0,0,0,.65);animation:ariaSlide .2s ease forwards; }

        @keyframes ariaToastIn{from{transform:translateX(-50%) translateY(-10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes ariaWave{from{transform:scaleY(.4)}to{transform:scaleY(1)}}

        @media(max-width:480px){.aria-root{right:14px;bottom:76px}}
      `}</style>

      <WakeToast visible={wakeToast} />
      {overlay && <ImageOverlay src={overlay.src} caption={overlay.caption} onClose={() => setOverlay(null)} />}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileInput} />

      <div className="aria-root">

        {isOpen && !isMin && (
          <div
            className="aria-panel first-open"
            style={panelStyle}
            role="dialog"
            aria-label="ARIA AI Assistant"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <DropOverlay visible={isDragging} />

            {/* Header */}
            <div className="aria-head">
              <div className="aria-av">AR</div>
              <div>
                <div className="aria-hname">ARIA</div>
                <div className="aria-hstatus">
                  <div className="aria-hdot" />
                  {isLoading ? "THINKING…" : wakeActive ? "LISTENING…" : "ONLINE · LLAMA 3.1 70B"}
                </div>
              </div>
              <div className="aria-hbtns">
                {/* Expand/collapse */}
                <button
                  className={`aria-hbtn${isExpanded ? " active" : ""}`}
                  onClick={toggleExpand}
                  title={isExpanded ? "Normal size" : "Expand for chart analysis"}
                >
                  {isExpanded
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>
                    : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                  }
                </button>

                {/* Wake word toggle */}
                {wakeSupported && (
                  <button
                    className={`aria-hbtn${wakeEnabled ? " active" : ""}`}
                    onClick={() => setWakeEnabled(v => !v)}
                    title={wakeEnabled ? 'Wake word ON — say "ARIA"' : "Enable wake word"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </button>
                )}

                {/* Clear */}
                <button className="aria-hbtn" onClick={clearChat} title="Clear chat">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>

                {/* Minimise */}
                <button className="aria-hbtn" onClick={() => setIsMin(true)} title="Minimise">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                {/* Close */}
                <button className="aria-hbtn" onClick={() => { setIsOpen(false); stopSpeaking() }} title="Close">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Wake word banner */}
            {wakeEnabled && wakeActive && (
              <div style={{ padding:"6px 18px", flexShrink:0, display:"flex", alignItems:"center", gap:8, background:"rgba(100,180,255,.05)", borderBottom:"1px solid rgba(100,180,255,.08)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:2.5 }}>
                  {[10,16,8,20,12,18,9,15,11].map((h,i) => (
                    <div key={i} style={{ width:2.5, height:h, borderRadius:2, background:"rgba(100,180,255,.5)", animation:`ariaWave .6s ease-in-out ${i*.08}s infinite alternate` }} />
                  ))}
                </div>
                <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.5)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  Listening for "ARIA"…
                </span>
              </div>
            )}

            {/* Context bar */}
            <div className="aria-ctx">
              <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              PAGE: {pathname.replace(/^\//,"").replace(/\//g," › ") || "home"}
              {isExpanded && (
                <span style={{ marginLeft:"auto", color:"rgba(140,80,255,.45)" }}>
                  📊 EXPANDED · CHART ANALYSIS MODE
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="aria-msgs" role="log" aria-live="polite">
              {messages.map(msg => (
                <Bubble
                  key={msg.id}
                  msg={msg}
                  onQuickReply={sendMessage}
                  onSpeakToggle={handleSpeakToggle}
                  speaking={speaking}
                  onImageExpand={(src, caption) => setOverlay({ src, caption })}
                />
              ))}
              {isLoading && (
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:"rgba(100,180,255,.08)", border:"1px solid rgba(100,180,255,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontFamily:"'DM Mono',monospace", color:"#a8d4ff" }}>AR</div>
                  <div className="aria-typing">
                    <div className="aria-d"/><div className="aria-d"/><div className="aria-d"/>
                  </div>
                </div>
              )}
              <div ref={bottomRef} style={{ flexShrink:0 }} />
            </div>

            {/* Pending image preview */}
            {pendingImage && (
              <div className="aria-imgbar">
                <div style={{ position:"relative", flexShrink:0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage} alt="pending" style={{ height:48, width:64, objectFit:"cover", borderRadius:8, border:"1px solid rgba(140,80,255,.25)" }} />
                  <button
                    onClick={removePendingImage}
                    style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:"rgba(244,63,94,.9)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div>
                  <p style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:"rgba(140,80,255,.7)", margin:0, letterSpacing:".05em" }}>CHART READY</p>
                  <p style={{ fontSize:10, color:"rgba(255,255,255,.35)", margin:"2px 0 0", fontFamily:"'DM Mono',monospace" }}>Send a message or press ↵ to analyse</p>
                </div>
                <button
                  onClick={() => sendMessage("Please analyse this chart in detail.", pendingImage)}
                  style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:20, background:"rgba(140,80,255,.15)", border:"1px solid rgba(140,80,255,.3)", color:"#c4a1ff", fontSize:10, cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0 }}
                >
                  ANALYSE ↵
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="aria-iarea">
              {/* Upload button */}
              <button
                className={`aria-btn aria-imgbtn${pendingImage ? " has-img" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                title="Upload chart for analysis"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>

              <div className="aria-iwrap">
                <textarea
                  ref={inputRef}
                  className="aria-ta"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={pendingImage ? "Add context or press ↵ to analyse chart…" : "Ask ARIA anything… or drag a chart here"}
                  rows={1}
                  aria-label="Message ARIA"
                />
              </div>

              {/* Voice */}
              <button
                className={`aria-btn aria-voice${listening ? " on" : ""}`}
                onClick={listening ? stopVoice : startVoice}
                title={listening ? "Stop listening" : "Voice input"}
              >
                {listening
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                }
              </button>

              {/* Send */}
              <button
                className="aria-btn aria-send"
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && !pendingImage) || isLoading}
                aria-label="Send"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div className="aria-foot">
              Powered by <span>Llama 3.1 70B</span> + <span>LLaVA 1.5 7B</span> · <span>Token Factory · ESPRIT</span>
            </div>
          </div>
        )}

        {/* Minimised strip */}
        {isOpen && isMin && (
          <div className="aria-mini" onClick={() => setIsMin(false)}>
            <div style={{ width:22, height:22, borderRadius:7, background:"rgba(100,180,255,.1)", border:"1px solid rgba(100,180,255,.16)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontFamily:"'DM Mono',monospace", color:"#a8d4ff", fontWeight:600 }}>AR</div>
            <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>ARIA</span>
            <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, fontFamily:"'DM Mono',monospace", color:"#10b981" }}>
              <div style={{ width:5, height:5, background:"#10b981", borderRadius:"50%", boxShadow:"0 0 5px rgba(16,185,129,.5)" }}/>ONLINE
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          className={`aria-fab${pulse ? " pulse" : ""}`}
          onClick={() => { setIsOpen(o => !o); setIsMin(false); setPulse(false) }}
          aria-label={isOpen ? "Close ARIA" : "Open ARIA"}
          aria-expanded={isOpen}
        >
          <div className="aria-fab-glow" />
          <div className="aria-fab-icon">
            {isOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.7">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <circle cx="9"  cy="10" r="1.2" fill="rgba(255,255,255,.75)"/>
                  <circle cx="12" cy="10" r="1.2" fill="rgba(255,255,255,.75)"/>
                  <circle cx="15" cy="10" r="1.2" fill="rgba(255,255,255,.75)"/>
                </svg>
            }
          </div>
          <div className={`aria-fab-dot${wakeActive ? " wake" : ""}`} />
        </button>
      </div>
    </>
  )
}