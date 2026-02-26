"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useChatbotActions } from "@/hooks/use-chatbot-actions"
import {
  RefreshCw, ExternalLink, TrendingUp, TrendingDown,
  Minus, BookmarkPlus, Share2, AlertCircle, Sparkles,
  Clock, Lock, Flame, BarChart2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  title: string
  excerpt: string
  source: string
  author: string | null
  publishedAt: string
  url: string
  urlToImage: string | null
  category: string
}

type Signal = "BUY" | "SELL" | "HOLD"

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Crypto:      { bg: "bg-orange-500/10", text: "text-orange-400",  border: "border-orange-500/25"  },
  Macro:       { bg: "bg-blue-500/10",   text: "text-blue-400",    border: "border-blue-500/25"    },
  Earnings:    { bg: "bg-emerald-500/10",text: "text-emerald-400", border: "border-emerald-500/25" },
  Commodities: { bg: "bg-yellow-500/10", text: "text-yellow-400",  border: "border-yellow-500/25"  },
  Forex:       { bg: "bg-purple-500/10", text: "text-purple-400",  border: "border-purple-500/25"  },
  "M&A":       { bg: "bg-pink-500/10",   text: "text-pink-400",    border: "border-pink-500/25"    },
  Markets:     { bg: "bg-cyan-500/10",   text: "text-cyan-400",    border: "border-cyan-500/25"    },
}

// Map category names to API query keywords
const CATEGORY_QUERIES: Record<string, string> = {
  all:         "stock market trading finance",
  crypto:      "crypto bitcoin ethereum blockchain",
  macro:       "macroeconomics fed interest rates inflation GDP",
  earnings:    "earnings revenue quarterly results",
  forex:       "forex currency EUR USD GBP JPY",
  commodities: "commodities oil gold silver",
  "m&a":       "merger acquisition deal buyout",
}

const ALL_CATEGORIES = ["All", "Crypto", "Macro", "Earnings", "Forex", "Commodities", "M&A"]

const MOCK_SIGNALS: Signal[] = ["BUY", "HOLD", "SELL", "BUY", "HOLD"]
const MOCK_CONVICTION = [74, 58, 83, 67, 61]
const MOCK_REASONING: Record<Signal, string> = {
  BUY:  "Positive sentiment detected across macro indicators. Multi-agent consensus leans bullish on this catalyst.",
  SELL: "Bearish signals identified. Risk-adjusted models suggest reducing exposure in correlated assets.",
  HOLD: "Mixed signals — insufficient conviction to act. Agents are monitoring for follow-through.",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Signal pill ──────────────────────────────────────────────────────────────

function SignalPill({ signal }: { signal: Signal }) {
  const cfg = {
    BUY:  { Icon: TrendingUp,   classes: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
    SELL: { Icon: TrendingDown, classes: "bg-red-500/15     border-red-500/30     text-red-400"     },
    HOLD: { Icon: Minus,        classes: "bg-amber-500/15   border-amber-500/30   text-amber-400"   },
  }[signal]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black tracking-widest ${cfg.classes}`}>
      <cfg.Icon className="h-3 w-3" />
      {signal}
    </span>
  )
}

// ─── AI Recommendation block ──────────────────────────────────────────────────

function AIRecommendation({ index }: { index: number }) {
  const signal = MOCK_SIGNALS[index % MOCK_SIGNALS.length]
  const conviction = MOCK_CONVICTION[index % MOCK_CONVICTION.length]
  const barColor = signal === "BUY" ? "bg-emerald-500" : signal === "SELL" ? "bg-red-500" : "bg-amber-500"

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#1e3a5f]/60 bg-[#060d1a]/60">
      <div className="flex items-center justify-between border-b border-[#1e3a5f]/50 bg-[#0a1628]/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/70">
            Agent Signal
          </span>
          <span className="rounded-full bg-[#334155]/50 px-2 py-0.5 text-[9px] text-muted-foreground/60 font-medium">
            Preview
          </span>
        </div>
        <SignalPill signal={signal} />
      </div>
      <div className="px-4 py-3.5">
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {MOCK_REASONING[signal]}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
              <BarChart2 className="h-3 w-3" />
              <span>Agent Conviction</span>
            </div>
            <span className="text-[11px] font-bold text-foreground">{conviction}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e293b]">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${conviction}%` }} />
          </div>
        </div>
        <p className="mt-3 text-[10px] italic text-muted-foreground/40">
          Live multi-agent analysis launching soon — signals will update in real-time.
        </p>
      </div>
    </div>
  )
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ article, index }: { article: Article; index: number }) {
  const style = CATEGORY_STYLES[article.category] ?? CATEGORY_STYLES["Markets"]
  const [saved, setSaved] = useState(false)

  return (
    <article className="overflow-hidden rounded-2xl border border-[#334155]/40 bg-[#111827]/70 backdrop-blur-sm transition-colors hover:border-[#334155]/70">
      {article.urlToImage && (
        <div className="relative h-52 w-full overflow-hidden bg-[#0a0f1e]">
          <img
            src={article.urlToImage}
            alt=""
            className="h-full w-full object-cover opacity-75 transition-transform duration-700 hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/30 to-transparent" />
          <div className="absolute left-4 bottom-4">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${style.bg} ${style.border} ${style.text}`}>
              {article.category}
            </span>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#334155]/60 bg-[#1e293b] text-[11px] font-black uppercase text-muted-foreground">
            {article.source.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{article.source}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{timeAgo(article.publishedAt)}</span>
              {article.author && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="truncate max-w-[120px]">{article.author.split(",")[0]}</span>
                </>
              )}
            </div>
          </div>
          {!article.urlToImage && (
            <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.border} ${style.text}`}>
              {article.category}
            </span>
          )}
        </div>

        <h2 className="mb-2.5 text-[15px] font-bold leading-snug text-foreground">
          {article.title}
        </h2>

        {article.excerpt && (
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-[#334155]/30 pt-4">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-[#334155]/40 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Read full article
          </a>
          <div className="flex items-center">
            <button
              onClick={() => setSaved(s => !s)}
              title="Save"
              className={`rounded-lg p-2 transition-colors ${saved ? "text-primary" : "text-muted-foreground hover:bg-[#334155]/40 hover:text-foreground"}`}
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
            <button
              title="Share"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#334155]/40 hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AIRecommendation index={index} />
      </div>
    </article>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[#334155]/40 bg-[#111827]/70">
          <div className="h-48 w-full bg-[#1e293b]/60" />
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#334155]/50" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-32 rounded bg-[#334155]/50" />
                <div className="h-2.5 w-24 rounded bg-[#334155]/30" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-[#334155]/50" />
            <div className="h-4 w-4/5 rounded bg-[#334155]/40" />
            <div className="h-3 w-full rounded bg-[#334155]/30" />
            <div className="h-3 w-2/3 rounded bg-[#334155]/30" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const [articles, setArticles]       = useState<Article[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date())
  const [activeCategory, setActiveCategory] = useState("All")

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) router.push("/login")
  }, [isAuthenticated, router])

  // ── Fetch news ────────────────────────────────────────────────────────────
  const fetchNews = useCallback(async (category = activeCategory) => {
    setLoading(true)
    setError(null)
    try {
      const query = CATEGORY_QUERIES[category.toLowerCase()] ?? CATEGORY_QUERIES["all"]
      const res   = await fetch(`/api/news?q=${encodeURIComponent(query)}&pageSize=20`)
      const data  = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to fetch")
      setArticles(data.articles ?? [])
      setRefreshedAt(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [activeCategory])

  // Fetch on mount + auto-refresh every 5 min
  useEffect(() => {
    fetchNews()
    const t = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchNews])

  // ── ARIA chatbot integration ──────────────────────────────────────────────
  useChatbotActions({
    onFilterFeed: (category) => {
      // Normalize the category ARIA sends (e.g. "crypto" → "Crypto")
      const normalized =
        ALL_CATEGORIES.find(
          (c) => c.toLowerCase() === category.toLowerCase()
        ) ?? "All"
      setActiveCategory(normalized)
      fetchNews(normalized)
    },
  })

  // ── Category tab click ────────────────────────────────────────────────────
  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat)
    fetchNews(cat)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#060d1a]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,108,255,0.08),transparent)]" />

      <div className="mx-auto max-w-[680px] px-4 pb-8 pt-20">

        {/* ── Feed header ── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">Market Feed</h1>
            <p className="text-xs text-muted-foreground">
              Live news · AI signals preview
              {activeCategory !== "All" && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {activeCategory}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {timeAgo(refreshedAt.toISOString())}
            </div>
            <button
              onClick={() => fetchNews()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-[#334155]/50 bg-[#1e293b]/40 px-3 py-2 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Category filter strip ── */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {ALL_CATEGORIES.map((tag, i) => (
            <button
              key={tag}
              onClick={() => handleCategoryClick(tag)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === tag
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-[#334155]/50 bg-[#1e293b]/40 text-muted-foreground hover:border-[#334155] hover:text-foreground"
              }`}
            >
              {i === 0 && <Flame className="mr-1 inline-block h-3 w-3" />}
              {tag}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading && <Skeleton />}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400/60" />
            <div>
              <p className="font-semibold text-foreground">Couldn't load feed</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={() => fetchNews()}
              className="rounded-xl border border-[#334155] px-5 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {articles.map((article, i) => (
              <ArticleCard key={i} article={article} index={i} />
            ))}
            {articles.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">No articles found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}