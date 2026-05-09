"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { agents } from "@/lib/agents"
import { useEffect, useState, useCallback } from 'react';
import { useTutorial } from "@/lib/tutorial-context"
import {
  ArrowRight,
  Play,
  Sparkles,
  TrendingUp,
  Brain,
  Shield,
  Zap,
} from "lucide-react"

export default function LandingPage() {
  interface FxRow {
  pair: string;
  price: number;
  prevClose: number;
  changePct: number;
  changeAbs: number;
  dayHigh: number;
  dayLow: number;
  // TODO: replace with your central_brain.py output when backend is ready
  signal: 'buy' | 'hold' | 'sell';
  confidence: number;
}

// ── Static config ─────────────────────────────────────────────────────────────
const PAIRS = [
  { key: 'EURUSD', ticker: 'EURUSD=X', flag: '🇪🇺', name: 'Euro / US Dollar' },
  { key: 'GBPUSD', ticker: 'GBPUSD=X', flag: '🇬🇧', name: 'Pound / US Dollar' },
  { key: 'USDJPY', ticker: 'USDJPY=X', flag: '🇯🇵', name: 'Dollar / Yen' },
  { key: 'USDCHF', ticker: 'USDCHF=X', flag: '🇨🇭', name: 'Dollar / Swiss Franc' },
  { key: 'EURJPY', ticker: 'EURJPY=X', flag: '🇪🇺', name: 'Euro / Yen' },
];

// Placeholder signals — swap with real API call when ready
const PLACEHOLDER_SIGNALS: Record<string, { signal: 'buy' | 'hold' | 'sell'; confidence: number }> = {
  EURUSD: { signal: 'buy',  confidence: 73 },
  GBPUSD: { signal: 'buy',  confidence: 61 },
  USDJPY: { signal: 'sell', confidence: 67 },
  USDCHF: { signal: 'hold', confidence: 44 },
  EURJPY: { signal: 'buy',  confidence: 58 },
};

// ── Yahoo Finance fetch ───────────────────────────────────────────────────────
// Uses the public Yahoo Finance v8 chart endpoint — no API key required.
// Proxied through Next.js /api/yahoo to avoid CORS (see route below).
async function fetchYahooPrice(ticker: string): Promise<{
  price: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
} | null> {
  try {
    const url = `/api/yahoo?ticker=${encodeURIComponent(ticker)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price:     meta.regularMarketPrice      ?? 0,
      prevClose: meta.previousClose            ?? meta.chartPreviousClose ?? 0,
      dayHigh:   meta.regularMarketDayHigh     ?? 0,
      dayLow:    meta.regularMarketDayLow      ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchAllPairs(): Promise<FxRow[]> {
  const results = await Promise.all(
    PAIRS.map(async (p) => {
      const data = await fetchYahooPrice(p.ticker);
      const sig  = PLACEHOLDER_SIGNALS[p.key];
      if (!data) return null;
      const changeAbs = data.price - data.prevClose;
      const changePct = data.prevClose > 0 ? (changeAbs / data.prevClose) * 100 : 0;
      return {
        pair:       p.key,
        price:      data.price,
        prevClose:  data.prevClose,
        changePct,
        changeAbs,
        dayHigh:    data.dayHigh,
        dayLow:     data.dayLow,
        signal:     sig.signal,
        confidence: sig.confidence,
      } satisfies FxRow;
    })
  );
  return results.filter(Boolean) as FxRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(pair: string, price: number): string {
  // JPY pairs have 2 decimal places, others 4
  const decimals = pair.includes('JPY') ? 2 : 4;
  return price.toFixed(decimals);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SignalBadge({ signal }: { signal: 'buy' | 'hold' | 'sell' }) {
  const cls = {
    buy:  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    sell: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300',
    hold: 'bg-gray-100  text-gray-600  dark:bg-gray-700/60  dark:text-gray-300',
  }[signal];
  return (
    <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>
      {signal.toUpperCase()}
    </span>
  );
}

function ConfBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{value}%</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 animate-pulse">
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ── Currency Table ────────────────────────────────────────────────────────────
function CurrencyTable() {
  const [rows, setRows]           = useState<FxRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchAllPairs();
      if (data.length === 0) throw new Error('empty');
      setRows(data);
      setError(false);
      setUpdatedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // Yahoo free tier — refresh every 30s
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="rounded-[24px] border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Live FX · Yahoo Finance
        </div>
        {updatedAt && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Updated {updatedAt}
          </span>
        )}
      </div>

      {/* States */}
      {loading && <Skeleton />}

      {error && !loading && (
        <div className="py-12 text-center text-sm text-red-400">
          Could not load market data.{' '}
          <button
            onClick={load}
            className="underline hover:text-red-300 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data table */}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ tableLayout: 'fixed', minWidth: '520px' }}
          >
            <thead>
              <tr className="border-b border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5">
                {[
                  { label: 'Pair',       cls: 'w-[160px]' },
                  { label: 'Price',      cls: 'w-[100px]' },
                  { label: 'Change',     cls: 'w-[90px]' },
                  { label: 'High / Low', cls: 'w-[120px] hidden sm:table-cell' },
                  { label: 'Signal',     cls: 'w-[80px]' },
                  { label: 'Confidence', cls: 'w-[130px] hidden md:table-cell' },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cfg    = PAIRS.find((p) => p.key === row.pair)!;
                const up     = row.changePct >= 0;
                const pctStr = `${up ? '+' : ''}${row.changePct.toFixed(2)}%`;
                const highStr = fmtPrice(row.pair, row.dayHigh);
                const lowStr  = fmtPrice(row.pair, row.dayLow);

                return (
                  <tr
                    key={row.pair}
                    className="border-b border-white/10 dark:border-white/5 last:border-0 hover:bg-white/10 dark:hover:bg-white/5 transition-colors duration-100"
                  >
                    {/* Pair */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{cfg.flag}</span>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white/90 text-xs">
                            {row.pair.slice(0, 3)}/{row.pair.slice(3)}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">
                            {cfg.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-mono font-medium text-gray-800 dark:text-white/90 text-xs tabular-nums">
                      {fmtPrice(row.pair, row.price)}
                    </td>

                    {/* Change */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          up
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {up ? '▲' : '▼'} {pctStr}
                      </span>
                    </td>

                    {/* High / Low */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                        <span className="text-green-600 dark:text-green-400">{highStr}</span>
                        {' / '}
                        <span className="text-red-500 dark:text-red-400">{lowStr}</span>
                      </span>
                    </td>

                    {/* Signal — TODO: replace PLACEHOLDER_SIGNALS with /api/signals */}
                    <td className="px-4 py-3">
                      <SignalBadge signal={row.signal} />
                    </td>

                    {/* Confidence — TODO: same */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <ConfBar value={row.confidence} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

  const { startTutorial } = useTutorial()

  return (
    <div className="relative">
      {/* Hero Section */}
     <section
  id="hero-section"
  className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20"
>
  {/* Video background */}
  <video
    className="absolute inset-0 w-full h-full object-cover"
    autoPlay
    loop
    muted
    playsInline
  >
    <source src="https://res.cloudinary.com/dcfad76uv/video/upload/v1771803261/test_cyol81.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>

  {/* Optional overlay for readability */}
  <div className="absolute inset-0 bg-black/30"></div>

  {/* Optional: subtle animated blur shapes on top of video */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
    <div className="absolute -right-40 bottom-40 h-96 w-96 rounded-full bg-secondary/10 blur-[120px]" />
    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[80px]" />
  </div>

  {/* Grid pattern overlay (optional) */}
  <div
    className="absolute inset-0 opacity-[0.02]"
    style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
      backgroundSize: "50px 50px",
    }}
  />

  {/* Main content */}
  <div className="relative z-10 mx-auto max-w-5xl text-center">
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
      <Sparkles className="h-4 w-4" />
      <span>Introducing Multi-Agent AI Analysis</span>
    </div>

    <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
      The Future of{" "}
      <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
        Forex Analysis
      </span>
    </h1>

    <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
      Five specialized AI agents work in harmony to deliver comprehensive,
      explainable forex market analysis. Experience trading insights that
      go beyond traditional technical indicators.
    </p>

    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Button size="lg" asChild className="gap-2 px-8">
        <Link href="/platform/overview">
          View Platform
          <ArrowRight className="h-5 w-5" />
        </Link>
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={startTutorial}
        className="gap-2 px-8 bg-transparent"
      >
        <Play className="h-5 w-5" />
        Start Tour
      </Button>
    </div>

    {/* Stats */}
    <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4">
      {[
        { value: "5", label: "AI Agents" },
        { value: "100+", label: "Data Sources" },
        { value: "24/7", label: "Analysis" },
        { value: "Real-time", label: "Updates" },
      ].map((stat) => (
        <div key={stat.label} className="text-center">
          <div className="text-3xl font-bold text-foreground md:text-4xl">
            {stat.value}
          </div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>

  {/* Scroll indicator */}
  <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
    <div className="flex h-10 w-6 items-start justify-center rounded-full border border-muted-foreground/30 p-2">
      <div className="h-2 w-1 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  </div>
</section>


<section
  id="problem-section"
  className="relative overflow-hidden px-6 py-24 md:py-32"
>
  <div className="mx-auto max-w-6xl">
    <div className="mb-16 text-center">
      <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
        The Problem with Traditional Analysis
      </h2>
      <p className="mx-auto max-w-2xl text-muted-foreground">
        Forex traders face fragmented information from multiple sources,
        making it nearly impossible to see the complete picture.
      </p>
    </div>

    {/* 👇 Centered 80% */}
    <div className="flex justify-center">
      <div className="w-full md:w-[80%]">
        <CurrencyTable />
      </div>
    </div>

  </div>
</section>

      {/* Agents Section */}
      <section
        id="agents-section"
        className="relative overflow-hidden px-6 py-24 md:py-32"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e293b]/50 to-transparent" />
        
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-2 text-sm text-secondary">
              <Zap className="h-4 w-4" />
              <span>Our Multi-Agent Solution</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Five Specialized AI Agents
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Each agent brings unique expertise, working together to provide
              comprehensive market analysis with full transparency.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, index) => (
              <div
                key={agent.id}
                className="group relative overflow-hidden rounded-2xl border border-[#334155]/50 bg-[#1e293b]/30 p-6 backdrop-blur-sm transition-all hover:border-[#334155] hover:bg-[#1e293b]/60"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Glassmorphism effect */}
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-[60px] transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: agent.color + "20" }}
                />
                
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: agent.color + "15" }}
                >
                  <agent.icon
                    className="h-7 w-7"
                    style={{ color: agent.color }}
                  />
                </div>

                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {agent.name}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-2">
                  {agent.capabilities.slice(0, 3).map((capability) => (
                    <div
                      key={capability}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      {capability}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Section */}
      <section
        id="future-section"
        className="relative overflow-hidden px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              The Future of Analysis
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              See how our platform will transform your trading decisions with
              AI-powered insights and explainable analysis.
            </p>
          </div>

          {/* Preview cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Unified Dashboard",
                description:
                  "All five agents' analyses in one view, with clear conviction scores and explanations for every recommendation.",
                gradient: "from-primary to-secondary",
              },
              {
                title: "Real-time Signals",
                description:
                  "Live market analysis with instant alerts when agents detect high-probability trading opportunities.",
                gradient: "from-secondary to-accent",
              },
              {
                title: "Explainable AI",
                description:
                  "Every signal comes with detailed reasoning, so you understand exactly why an opportunity exists.",
                gradient: "from-accent to-primary",
              },
              {
                title: "Historical Analysis",
                description:
                  "Review past signals, track accuracy, and continuously improve your understanding of market dynamics.",
                gradient: "from-primary to-accent",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-[#334155]/50 bg-[#1e293b]/30 p-8 backdrop-blur-sm transition-all hover:border-[#334155]"
              >
                <div
                  className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-[40px] transition-opacity group-hover:opacity-20`}
                />
                <h3 className="mb-3 text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="cta-section"
        className="relative overflow-hidden px-6 py-24 md:py-32"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b]/80 to-transparent" />
        
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Ready to Transform Your Trading?
          </h2>
          <p className="mb-10 text-lg text-muted-foreground">
            Join the waitlist to be among the first to experience AI-powered
            forex analysis when we launch.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="gap-2 px-8">
              <Link href="/signup">
                Get Early Access
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="px-8 bg-transparent">
              <Link href="/platform/overview">Explore Platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#334155]/50 px-6 py-12">
       <div className="mb-8 flex flex-col items-center gap-2">
  <img
    src="/logo.png"
    alt="FX-AlphaLab"
    className="h-20 w-20 rounded-full border-2 border-primary object-cover"
  />
  <span className="text-lg font-black tracking-widest text-foreground">
    <span className="text-primary">FX-</span>ALPHALAB
  </span>
</div>
          <p className="text-sm text-muted-foreground">
            2026 FX-AlphaLab. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </div>
      </footer>
    </div>
  )
}
