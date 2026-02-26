"use client"
// components/chatbot/chatbot.tsx

import React, { useState, useRef, useEffect, useCallback } from "react"
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
  id:           string
  role:         "user" | "assistant"
  content:      string
  streaming:    boolean
  actions?:     Action[]
  signalCards?: SignalCard[]
  quickReplies?:QuickReply[]
  timestamp:    Date
}

// ─── Page-aware suggestions ───────────────────────────────────────────────────

const PAGE_SUGGESTIONS: Record<string, QuickReply[]> = {
  "/platform/overview": [
    { label:"🔥 Crypto news",  message:"Show me crypto news"            },
    { label:"💱 Forex filter", message:"Filter the feed for forex news"  },
    { label:"📈 Macro news",   message:"Show me macro economic news"     },
    { label:"📝 Top story",    message:"Summarize the top article"       },
  ],
  "/platform/recommendations": [
    { label:"📊 Signals",    message:"Show me live signal cards"              },
    { label:"🎯 Best trade", message:"What's the highest conviction trade?"   },
  ],
  "/profile": [
    { label:"💼 My stats", message:"Show me my portfolio stats"               },
    { label:"⚠️ Risk",    message:"What's my overall risk exposure?"          },
  ],
  default: [
    { label:"📰 Crypto",    message:"Show me crypto news"                     },
    { label:"📊 Signals",   message:"Show me live signal cards"               },
    { label:"💼 Portfolio", message:"Show me my portfolio stats"              },
    { label:"🤖 Agents",    message:"Explain the AI agents"                   },
    { label:"❓ Strategy",  message:"What is a carry trade?"                  },
  ],
}

// ─── Mock signals ─────────────────────────────────────────────────────────────

const SIGNALS: SignalCard[] = [
  { pair:"EUR/USD", signal:"BUY",  conviction:78, reason:"Bullish RSI divergence on 4H. ECB dovish pivot partially priced in." },
  { pair:"GBP/JPY", signal:"SELL", conviction:82, reason:"Bearish engulfing at key resistance. Risk-off flows accelerating."    },
  { pair:"XAU/USD", signal:"HOLD", conviction:61, reason:"Mixed signals — CPI data pending. Wait for breakout confirmation."   },
  { pair:"BTC/USD", signal:"BUY",  conviction:71, reason:"On-chain accumulation spiking. Institutional demand confirmed."      },
]

const ACTION_LABELS: Record<string, (p: any) => string> = {
  navigate:            (p) => `→ ${p.path}`,
  filter_news_feed:    (p) => `Filter → ${p.category}`,
  explain_agent:       (p) => `Agent: ${p.agentId}`,
  highlight_portfolio: (p) => `Portfolio: ${p.portfolioName}`,
  show_signal_cards:   ()  => "Signals loaded",
  show_portfolio_stats:()  => "Portfolio loaded",
  summarize_article:   (p) => `Summarized: ${p.topic}`,
}

// ─── Signal card UI ───────────────────────────────────────────────────────────

function SignalCardUI({ card }: { card: SignalCard }) {
  const cfg = {
    BUY:  { bg:"rgba(0,230,118,.08)",  border:"rgba(0,230,118,.22)",  color:"#00e676", lbl:"▲ BUY"  },
    SELL: { bg:"rgba(255,82,82,.08)",   border:"rgba(255,82,82,.22)",   color:"#ff5252", lbl:"▼ SELL" },
    HOLD: { bg:"rgba(255,193,7,.08)",   border:"rgba(255,193,7,.22)",   color:"#ffc107", lbl:"● HOLD" },
  }[card.signal]
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:11, padding:"9px 12px", marginBottom:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12.5, fontWeight:600, color:"#fff", letterSpacing:".04em" }}>{card.pair}</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color:cfg.color, letterSpacing:".1em" }}>{cfg.lbl}</span>
      </div>
      <div style={{ marginBottom:6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.3)", marginBottom:3 }}>
          <span>CONVICTION</span>
          <span style={{ color:"#fff", fontWeight:600 }}>{card.conviction}%</span>
        </div>
        <div style={{ height:3, background:"rgba(255,255,255,.07)", borderRadius:2 }}>
          <div style={{ height:"100%", width:`${card.conviction}%`, background:cfg.color, borderRadius:2 }}/>
        </div>
      </div>
      <p style={{ fontSize:10.5, color:"rgba(255,255,255,.42)", margin:0, lineHeight:1.5 }}>{card.reason}</p>
    </div>
  )
}

// ─── Streaming text ───────────────────────────────────────────────────────────

function StreamText({ text, active, onDone }: { text:string; active:boolean; onDone?:()=>void }) {
  const [shown, setShown] = useState(active ? "" : text)
  const ref = useRef(0)

  useEffect(() => {
    if (!active) { setShown(text); onDone?.(); return }
    ref.current = 0; setShown("")
    const iv = setInterval(() => {
      ref.current++
      setShown(text.slice(0, ref.current))
      if (ref.current >= text.length) { clearInterval(iv); onDone?.() }
    }, 10)
    return () => clearInterval(iv)
  }, [text, active]) // eslint-disable-line

  const toHtml = (line: string) =>
    line
      .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#a8d4ff;font-weight:600'>$1</strong>")
      .replace(/\*(.*?)\*/g,     "<em style='color:rgba(255,255,255,.5)'>$1</em>")
      .replace(/`(.*?)`/g,       "<code style='background:rgba(100,200,255,.1);border:1px solid rgba(100,200,255,.18);border-radius:4px;padding:1px 5px;font-family:DM Mono,monospace;font-size:11px;color:#7dd3fc'>$1</code>")

  return (
    <>
      {shown.split("\n").map((line,i) => (
        <p key={i} style={{ margin:0, lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html: toHtml(line)||"&nbsp;" }}/>
      ))}
      {active && shown.length < text.length && (
        <span style={{ display:"inline-block", width:2, height:13, background:"#7dd3fc", borderRadius:1, marginLeft:2, verticalAlign:"middle", animation:"ariaCursor .7s ease-in-out infinite" }}/>
      )}
    </>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg, onQuickReply }: { msg:Message; onQuickReply:(t:string)=>void }) {
  const [streamDone, setStreamDone] = useState(!msg.streaming)
  const isA = msg.role === "assistant"

  return (
    <div style={{ display:"flex", gap:8, flexDirection:isA?"row":"row-reverse", animation:"ariaIn .2s ease forwards" }}>
      <div style={{
        width:27, height:27, borderRadius:8, flexShrink:0, marginTop:2,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: isA ? "linear-gradient(135deg,rgba(100,180,255,.15),rgba(60,100,255,.25))" : "rgba(255,255,255,.06)",
        border: isA ? "1px solid rgba(100,180,255,.18)" : "1px solid rgba(255,255,255,.07)",
        fontSize:8.5, fontWeight:600, fontFamily:"'DM Mono',monospace",
        color: isA ? "#a8d4ff" : "rgba(255,255,255,.35)", letterSpacing:".05em",
      }}>
        {isA ? "AI" : "ME"}
      </div>

      <div style={{ maxWidth:"81%", display:"flex", flexDirection:"column", alignItems:isA?"flex-start":"flex-end" }}>
        <div style={{
          padding:"10px 13px", borderRadius:14,
          background: isA ? "rgba(255,255,255,.04)" : "linear-gradient(135deg,rgba(60,130,255,.18),rgba(30,60,200,.14))",
          border: isA ? "1px solid rgba(255,255,255,.07)" : "1px solid rgba(100,160,255,.18)",
          borderTopLeftRadius:isA?3:14, borderTopRightRadius:isA?14:3,
          backdropFilter:"blur(10px)", fontSize:12.5, color:"rgba(255,255,255,.85)", wordBreak:"break-word",
        }}>
          <StreamText text={msg.content} active={msg.streaming} onDone={()=>setStreamDone(true)}/>

          {msg.signalCards && msg.signalCards.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:8.5, fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,.22)", letterSpacing:".12em", textTransform:"uppercase", marginBottom:7 }}>▸ LIVE AGENT SIGNALS</div>
              {msg.signalCards.map((c,i) => <SignalCardUI key={i} card={c}/>)}
            </div>
          )}

          {msg.actions && msg.actions.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
              {msg.actions.map((a,i) => (
                <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:20, background:"rgba(0,230,118,.07)", border:"1px solid rgba(0,230,118,.18)", fontSize:9.5, fontFamily:"'DM Mono',monospace", color:"#00e676" }}>
                  ✓ {ACTION_LABELS[a.type]?.(a.payload) ?? a.type}
                </span>
              ))}
            </div>
          )}
        </div>

        {streamDone && msg.quickReplies && msg.quickReplies.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
            {msg.quickReplies.map((qr,i) => (
              <button key={i} onClick={()=>onQuickReply(qr.message)} style={{
                padding:"5px 10px", borderRadius:20, cursor:"pointer",
                background:"rgba(100,180,255,.06)", border:"1px solid rgba(100,180,255,.15)",
                fontSize:10.5, color:"rgba(140,200,255,.8)", fontFamily:"'DM Mono',monospace", transition:"all .15s",
              }}
              onMouseEnter={e=>{(e.currentTarget as any).style.background="rgba(100,180,255,.13)";(e.currentTarget as any).style.borderColor="rgba(100,180,255,.35)"}}
              onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(100,180,255,.06)";(e.currentTarget as any).style.borderColor="rgba(100,180,255,.15)"}}
              >{qr.label}</button>
            ))}
          </div>
        )}

        <div style={{ fontSize:8.5, color:"rgba(255,255,255,.14)", fontFamily:"'DM Mono',monospace", marginTop:3, paddingInline:2 }}>
          {msg.timestamp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    </div>
  )
}

// ─── Wake word toast ──────────────────────────────────────────────────────────

function WakeToast({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position:"fixed", top:24, left:"50%", transform:"translateX(-50%)",
      background:"rgba(6,10,22,.95)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(100,180,255,.25)", borderRadius:40,
      padding:"10px 20px", display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(100,180,255,.08)",
      zIndex:10000, animation:"ariaToastIn .3s cubic-bezier(.34,1.4,.64,1) forwards",
      whiteSpace:"nowrap",
    }}>
      {/* Animated waveform */}
      <div style={{ display:"flex", alignItems:"center", gap:2.5 }}>
        {[1,1.6,.8,1.4,.9,1.2,1.5].map((h,i) => (
          <div key={i} style={{
            width:3, height:14*h, borderRadius:2, background:"#a8d4ff",
            animation:`ariaWave .8s ease-in-out ${i*.1}s infinite alternate`,
          }}/>
        ))}
      </div>
      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"rgba(255,255,255,.75)", letterSpacing:".06em" }}>
        ARIA is listening…
      </span>
      <div style={{ width:7, height:7, background:"#00e676", borderRadius:"50%", boxShadow:"0 0 8px rgba(0,230,118,.7)", animation:"ariaDotPing 1s ease-in-out infinite" }}/>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Chatbot() {
  const router   = useRouter()
  const pathname = usePathname()
  const { dispatch } = useChatbot()

  const [isOpen,       setIsOpen]       = useState(false)
  const [isMin,        setIsMin]        = useState(false)
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState("")
  const [isLoading,    setIsLoading]    = useState(false)
  const [pulse,        setPulse]        = useState(true)
  const [listening,    setListening]    = useState(false)
  const [wakeEnabled,  setWakeEnabled]  = useState(false)  // off by default, user turns on
  const [wakeToast,    setWakeToast]    = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const voiceRef  = useRef<any>(null)

  // ── Wake word hook ─────────────────────────────────────────────────────────
  const handleWake = useCallback(() => {
    setWakeToast(true)
    setIsOpen(true)
    setIsMin(false)
    setTimeout(() => setWakeToast(false), 4000)
  }, [])

  const handleWakeCommand = useCallback((text: string) => {
    setWakeToast(false)
    setInput(text)
    // Small delay to let panel open first
    setTimeout(() => sendMessage(text), 400)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { supported: wakeSupported, active: wakeActive } = useWakeWord({
    onWake:    handleWake,
    onCommand: handleWakeCommand,
    enabled:   wakeEnabled,
  })

  // ── Welcome message ────────────────────────────────────────────────────────
  useEffect(() => {
    const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
    const names: Record<string,string> = {
      "/platform/overview":"the **Market Feed**",
      "/platform/recommendations":"**Recommendations**",
      "/platform/history":"**Trade History**",
      "/profile":"your **Profile**",
      "/settings":"**Settings**",
      "/signals":"the **Signals** dashboard",
    }
    const agentMatch = pathname.match(/\/agents\/(\w+)/)
    const where = agentMatch ? `the **${agentMatch[1]}** agent page` : names[pathname] ?? "**AlphaLab**"

    setMessages([{
      id:"welcome", role:"assistant",
      content:`I'm **ARIA** — your trading intelligence assistant.\nYou're on ${where}. How can I help?`,
      streaming:true, quickReplies:suggs, timestamp:new Date(),
    }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => { const t=setTimeout(()=>setPulse(false),8000); return()=>clearTimeout(t) },[])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages, isLoading])
  useEffect(() => { if(isOpen&&!isMin) setTimeout(()=>inputRef.current?.focus(),260) }, [isOpen,isMin])

  // ── Execute actions ────────────────────────────────────────────────────────
  const executeActions = useCallback((actions: Action[]) => {
    for (const a of actions) {
      switch (a.type) {
        case "navigate":            router.push(a.payload.path); dispatch({ type:"navigate", payload:a.payload as any }); break
        case "filter_news_feed":    router.push("/platform/overview"); dispatch({ type:"filter_news_feed", payload:a.payload as any }); break
        case "explain_agent":       router.push(`/agents/${a.payload.agentId}`); dispatch({ type:"explain_agent", payload:a.payload as any }); break
        case "highlight_portfolio": router.push("/profile"); dispatch({ type:"highlight_portfolio", payload:a.payload as any }); break
      }
    }
  }, [router, dispatch])

  // ── Manual voice input ─────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert("Voice requires Chrome or Edge."); return }
    const r = new SR(); r.lang="en-US"; r.interimResults=false
    r.onstart  = ()=>setListening(true)
    r.onend    = ()=>setListening(false)
    r.onerror  = ()=>setListening(false)
    r.onresult = (e:any)=>{ const t=e.results[0][0].transcript; setInput(t); setTimeout(()=>sendMessage(t),150) }
    voiceRef.current=r; r.start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  const stopVoice = useCallback(()=>{ voiceRef.current?.stop(); setListening(false) },[])

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const clean = text.trim()
    const lower = clean.toLowerCase()

    const userMsg: Message = { id:Date.now().toString(), role:"user", content:clean, streaming:false, timestamp:new Date() }
    const history = messages.filter(m=>m.id!=="welcome").map(m=>({ role:m.role, content:m.content }))

    setMessages(prev=>[...prev, userMsg])
    setInput("")
    setIsLoading(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res  = await fetch("/api/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ messages:[...history,{role:"user",content:clean}] }),
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (data.actions?.length>0) executeActions(data.actions)

      const wantsSignals = data.actions?.some((a:Action)=>a.type==="show_signal_cards")
        || /\b(signal|trade setup|what to trade|entry|setup)\b/.test(lower)

      const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
      const qr: QuickReply[] = []
      if (wantsSignals)                     qr.push({ label:"📊 Dashboard",  message:"Take me to signals dashboard"  })
      if (/portfolio|capital/i.test(lower)) qr.push({ label:"✏️ Edit",       message:"Take me to my profile"         })
      if (/news|article|feed/i.test(lower)) qr.push({ label:"📰 More news",  message:"Show me more market news"      })
      if (/agent/i.test(lower))             qr.push({ label:"🤖 Agents",     message:"Take me to the agents page"    })
      if (qr.length===0)                    qr.push(...suggs.slice(0,3))

      setMessages(prev=>[...prev,{
        id:(Date.now()+1).toString(), role:"assistant",
        content: data.content || "I couldn't generate a response. Try again.",
        streaming:true,
        actions:     data.actions?.length>0 ? data.actions : undefined,
        signalCards: wantsSignals ? SIGNALS : undefined,
        quickReplies:qr,
        timestamp:new Date(),
      }])
    } catch(err:any) {
      if (err.name==="AbortError") return
      setMessages(prev=>[...prev,{
        id:(Date.now()+1).toString(), role:"assistant",
        content:"⚠️ ARIA is offline. Open a terminal and run `ollama serve`, then refresh.",
        streaming:true, timestamp:new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, executeActions, pathname])

  const handleKey = (e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
    if (e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(input) }
  }

  const clearChat = ()=>{
    const suggs = PAGE_SUGGESTIONS[pathname] ?? PAGE_SUGGESTIONS.default
    setMessages([{ id:"welcome", role:"assistant", content:"Chat cleared. What do you need?", streaming:true, quickReplies:suggs, timestamp:new Date() }])
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800&display=swap');

        .aria-root { position:fixed; bottom:28px; right:28px; z-index:9999; font-family:'Outfit',sans-serif; }

        .aria-fab {
          width:56px; height:56px; border-radius:17px; border:none; cursor:pointer;
          position:relative; display:flex; align-items:center; justify-content:center;
          background:rgba(8,14,28,.92); backdrop-filter:blur(20px);
          box-shadow:0 0 0 1px rgba(100,180,255,.15),0 8px 32px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.07);
          transition:transform .2s,box-shadow .2s; overflow:hidden;
        }
        .aria-fab-glow { position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(100,180,255,.14),rgba(60,100,255,.09),rgba(100,60,255,.07));animation:ariaHue 7s linear infinite; }
        @keyframes ariaHue{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}
        .aria-fab:hover { transform:scale(1.07) translateY(-2px);box-shadow:0 0 0 1px rgba(100,180,255,.28),0 16px 48px rgba(0,0,0,.7),0 0 40px rgba(60,100,255,.12),inset 0 1px 0 rgba(255,255,255,.1); }
        .aria-fab.pulse::after { content:'';position:absolute;inset:-3px;border-radius:20px;border:1.5px solid rgba(100,180,255,.35);animation:ariaPulseRing 2s ease-out infinite; }
        @keyframes ariaPulseRing{0%{transform:scale(1);opacity:1}100%{transform:scale(1.5);opacity:0}}
        .aria-fab-icon { position:relative;z-index:1; }
        .aria-fab-dot { position:absolute;top:9px;right:9px;width:9px;height:9px;background:#00e676;border-radius:50%;border:1.5px solid rgba(0,0,0,.35);z-index:2;box-shadow:0 0 6px rgba(0,230,118,.6);animation:ariaDotPing 2s ease-in-out infinite; }
        .aria-fab-dot.wake { background:#a8d4ff;box-shadow:0 0 10px rgba(100,180,255,.8);animation:ariaWakeDot .5s ease-in-out infinite alternate; }
        @keyframes ariaWakeDot{from{transform:scale(1)}to{transform:scale(1.4)}}
        @keyframes ariaDotPing{0%,100%{box-shadow:0 0 0 0 rgba(0,230,118,.5)}50%{box-shadow:0 0 0 4px rgba(0,230,118,0)}}

        .aria-panel {
          position:absolute;bottom:72px;right:0;width:400px;
          background:rgba(6,10,22,.90);backdrop-filter:blur(48px) saturate(180%);
          border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.07);
          box-shadow:0 0 0 1px rgba(100,180,255,.04),0 48px 96px rgba(0,0,0,.85),0 0 80px rgba(40,80,200,.06);
          display:flex;flex-direction:column;max-height:calc(100vh - 120px);
          transform-origin:bottom right;animation:ariaSlide .28s cubic-bezier(.34,1.4,.64,1) forwards;
        }
        @keyframes ariaSlide{from{transform:scale(.86) translateY(12px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}

        .aria-head { padding:14px 18px 12px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:11px;background:linear-gradient(180deg,rgba(100,180,255,.05) 0%,transparent 100%); }
        .aria-av { width:35px;height:35px;border-radius:11px;flex-shrink:0;background:linear-gradient(135deg,rgba(100,180,255,.14),rgba(60,100,255,.22));border:1px solid rgba(100,180,255,.16);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;color:#a8d4ff;letter-spacing:.06em; }
        .aria-hname { font-size:13.5px;font-weight:700;color:#fff;letter-spacing:.02em; }
        .aria-hstatus { font-size:9px;color:rgba(100,180,255,.5);font-family:'DM Mono',monospace;display:flex;align-items:center;gap:4px;margin-top:2px;letter-spacing:.05em; }
        .aria-hdot { width:5px;height:5px;background:#00e676;border-radius:50%;box-shadow:0 0 5px rgba(0,230,118,.5);animation:ariaDotPing 2s ease-in-out infinite; }
        .aria-hbtns { margin-left:auto;display:flex;gap:4px; }
        .aria-hbtn { width:27px;height:27px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.28);transition:all .15s; }
        .aria-hbtn:hover { background:rgba(255,255,255,.08);color:rgba(255,255,255,.65);border-color:rgba(255,255,255,.1); }
        .aria-hbtn.wake-on { background:rgba(100,180,255,.1);border-color:rgba(100,180,255,.25);color:#a8d4ff; }

        .aria-ctx { padding:5px 18px;flex-shrink:0;background:rgba(100,180,255,.03);border-bottom:1px solid rgba(100,180,255,.06);font-size:8.5px;font-family:'DM Mono',monospace;color:rgba(100,180,255,.38);display:flex;align-items:center;gap:5px;letter-spacing:.07em;text-transform:uppercase; }

        /* Wake word banner */
        .aria-wake-banner { padding:6px 18px;flex-shrink:0;display:flex;align-items:center;gap:8px;background:rgba(100,180,255,.05);border-bottom:1px solid rgba(100,180,255,.08); }
        .aria-wake-waves { display:flex;align-items:center;gap:2px; }
        .aria-wake-bar { width:2.5px;border-radius:2px;background:rgba(100,180,255,.5); }

        .aria-msgs { flex:1;overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;gap:12px;min-height:0; }
        .aria-msgs::-webkit-scrollbar{width:3px;}
        .aria-msgs::-webkit-scrollbar-thumb{background:rgba(100,180,255,.12);border-radius:2px;}

        @keyframes ariaIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ariaCursor{0%,100%{opacity:1}50%{opacity:0}}

        .aria-typing { display:flex;align-items:center;gap:5px;padding:9px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:13px;border-top-left-radius:3px;width:fit-content;flex-shrink:0; }
        .aria-d { width:5px;height:5px;border-radius:50%;background:rgba(100,180,255,.45);animation:ariaB 1.2s ease-in-out infinite; }
        .aria-d:nth-child(2){animation-delay:.2s}.aria-d:nth-child(3){animation-delay:.4s}
        @keyframes ariaB{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}

        .aria-iarea { padding:10px 14px 14px;flex-shrink:0;border-top:1px solid rgba(255,255,255,.05);display:flex;gap:6px;align-items:flex-end;background:rgba(6,10,22,.6); }
        .aria-iwrap { flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;transition:border-color .2s,box-shadow .2s; }
        .aria-iwrap:focus-within { border-color:rgba(100,180,255,.28);box-shadow:0 0 0 3px rgba(100,180,255,.05); }
        .aria-ta { width:100%;background:transparent;border:none;outline:none;padding:10px 12px;font-size:13px;color:rgba(255,255,255,.85);font-family:'Outfit',sans-serif;resize:none;min-height:40px;max-height:96px;line-height:1.5;display:block; }
        .aria-ta::placeholder { color:rgba(255,255,255,.16); }
        .aria-btn { width:39px;height:39px;border-radius:11px;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .18s; }
        .aria-send { background:linear-gradient(135deg,rgba(100,180,255,.2),rgba(60,100,255,.28));border:1px solid rgba(100,180,255,.22);color:#a8d4ff; }
        .aria-send:hover:not(:disabled) { background:linear-gradient(135deg,rgba(100,180,255,.32),rgba(60,100,255,.4));transform:scale(1.06);box-shadow:0 4px 16px rgba(60,100,255,.22); }
        .aria-send:disabled { opacity:.28;cursor:not-allowed; }
        .aria-voice { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.32); }
        .aria-voice:hover { background:rgba(255,255,255,.08);color:rgba(255,255,255,.6); }
        .aria-voice.on { background:rgba(255,60,60,.12);border-color:rgba(255,80,80,.25);color:#ff6b6b;animation:ariaVoice .8s ease-in-out infinite; }
        @keyframes ariaVoice{0%,100%{box-shadow:0 0 0 0 rgba(255,60,60,.25)}50%{box-shadow:0 0 0 5px rgba(255,60,60,0)}}

        .aria-foot { padding:5px 16px 9px;flex-shrink:0;text-align:center;font-size:8px;font-family:'DM Mono',monospace;color:rgba(255,255,255,.1);letter-spacing:.08em;text-transform:uppercase; }
        .aria-foot span { color:rgba(100,180,255,.28); }

        .aria-mini { position:absolute;bottom:70px;right:0;cursor:pointer;background:rgba(6,10,22,.92);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:9px 15px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 32px rgba(0,0,0,.65);animation:ariaSlide .2s ease forwards; }

        /* Toast */
        @keyframes ariaToastIn{from{transform:translateX(-50%) translateY(-10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes ariaWave{from{transform:scaleY(.4)}to{transform:scaleY(1)}}

        @media(max-width:480px){.aria-panel{width:calc(100vw - 28px)}.aria-root{right:14px;bottom:76px}}
      `}</style>

      {/* ── Wake word toast ── */}
      <WakeToast visible={wakeToast}/>

      <div className="aria-root">

        {isOpen && !isMin && (
          <div className="aria-panel" role="dialog" aria-label="ARIA AI Assistant">

            {/* Header */}
            <div className="aria-head">
              <div className="aria-av">AR</div>
              <div>
                <div className="aria-hname">ARIA</div>
                <div className="aria-hstatus">
                  <div className="aria-hdot"/>
                  {isLoading ? "THINKING…" : wakeActive ? "LISTENING FOR COMMANDS…" : "ONLINE · LLAMA 3.2"}
                </div>
              </div>
              <div className="aria-hbtns">
                {/* Wake word toggle */}
                {wakeSupported && (
                  <button
                    className={`aria-hbtn${wakeEnabled?" wake-on":""}`}
                    onClick={()=>setWakeEnabled(v=>!v)}
                    title={wakeEnabled ? 'Wake word ON — say "ARIA" to activate' : "Enable wake word"}
                    style={{ position:"relative" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    {wakeEnabled && (
                      <span style={{ position:"absolute", top:3, right:3, width:4, height:4, background:"#00e676", borderRadius:"50%" }}/>
                    )}
                  </button>
                )}
                <button className="aria-hbtn" onClick={clearChat} title="Clear chat">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
                <button className="aria-hbtn" onClick={()=>setIsMin(true)} title="Minimise">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button className="aria-hbtn" onClick={()=>setIsOpen(false)} title="Close">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Wake word active banner */}
            {wakeEnabled && wakeActive && (
              <div className="aria-wake-banner">
                <div className="aria-wake-waves">
                  {[10,16,8,20,12,18,9,15,11].map((h,i)=>(
                    <div key={i} className="aria-wake-bar" style={{ height:h, animationDelay:`${i*.08}s`, animation:`ariaWave .6s ease-in-out ${i*.08}s infinite alternate` }}/>
                  ))}
                </div>
                <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.5)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  Listening for "ARIA"…
                </span>
              </div>
            )}

            {/* Wake word hint banner (when enabled but not actively detecting) */}
            {wakeEnabled && !wakeActive && (
              <div style={{ padding:"5px 18px", flexShrink:0, background:"rgba(100,180,255,.03)", borderBottom:"1px solid rgba(100,180,255,.05)", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:8.5, fontFamily:"'DM Mono',monospace", color:"rgba(100,180,255,.3)", letterSpacing:".07em", textTransform:"uppercase" }}>
                  💬 Say <strong style={{ color:"rgba(100,180,255,.5)" }}>"ARIA"</strong> anywhere on the platform to activate
                </span>
              </div>
            )}

            {/* Context bar */}
            <div className="aria-ctx">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
              PAGE: {pathname.replace(/^\//,"").replace(/\//g," › ")||"home"}
            </div>

            {/* Messages */}
            <div className="aria-msgs" role="log" aria-live="polite">
              {messages.map(msg=>(
                <Bubble key={msg.id} msg={msg} onQuickReply={sendMessage}/>
              ))}
              {isLoading && (
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <div style={{ width:27,height:27,borderRadius:8,background:"rgba(100,180,255,.08)",border:"1px solid rgba(100,180,255,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontFamily:"'DM Mono',monospace",color:"#a8d4ff" }}>AI</div>
                  <div className="aria-typing"><div className="aria-d"/><div className="aria-d"/><div className="aria-d"/></div>
                </div>
              )}
              <div ref={bottomRef} style={{ flexShrink:0 }}/>
            </div>

            {/* Input */}
            <div className="aria-iarea">
              <div className="aria-iwrap">
                <textarea ref={inputRef} className="aria-ta" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask ARIA anything…" rows={1} aria-label="Message ARIA"/>
              </div>
              <button className={`aria-btn aria-voice${listening?" on":""}`} onClick={listening?stopVoice:startVoice} title={listening?"Stop":"Voice input"}>
                {listening
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                }
              </button>
              <button className="aria-btn aria-send" onClick={()=>sendMessage(input)} disabled={!input.trim()||isLoading} aria-label="Send">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>

            <div className="aria-foot">Powered by <span>Ollama</span> · <span>LLaMA 3.2</span> · Running locally</div>
          </div>
        )}

        {/* Minimised */}
        {isOpen && isMin && (
          <div className="aria-mini" onClick={()=>setIsMin(false)}>
            <div style={{width:22,height:22,borderRadius:7,background:"rgba(100,180,255,.1)",border:"1px solid rgba(100,180,255,.16)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontFamily:"'DM Mono',monospace",color:"#a8d4ff",fontWeight:500}}>AR</div>
            <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.7)",fontFamily:"'Outfit',sans-serif"}}>ARIA</span>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,fontFamily:"'DM Mono',monospace",color:"#00e676"}}>
              <div style={{width:5,height:5,background:"#00e676",borderRadius:"50%",boxShadow:"0 0 5px rgba(0,230,118,.5)"}}/>ONLINE
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          className={`aria-fab${pulse?" pulse":""}`}
          onClick={()=>{ setIsOpen(o=>!o); setIsMin(false); setPulse(false) }}
          aria-label={isOpen?"Close ARIA":"Open ARIA"} aria-expanded={isOpen}
        >
          <div className="aria-fab-glow"/>
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
          <div className={`aria-fab-dot${wakeActive?" wake":""}`}/>
        </button>
      </div>
    </>
  )
}