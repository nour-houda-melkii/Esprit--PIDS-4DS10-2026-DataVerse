"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { agents } from "@/lib/agents"
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


      {/* Problem Section */}
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

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: "Fragmented Data",
                description:
                  "Technical indicators, news feeds, and economic data exist in silos, forcing manual correlation.",
              },
              {
                icon: Brain,
                title: "Information Overload",
                description:
                  "Thousands of data points create noise, making it hard to identify what truly matters.",
              },
              {
                icon: Shield,
                title: "Black Box Systems",
                description:
                  "Most AI trading tools provide signals without explanation, leaving traders in the dark.",
              },
            ].map((problem) => (
              <div
                key={problem.title}
                className="group rounded-2xl border border-[#334155]/50 bg-[#1e293b]/30 p-8 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-[#1e293b]/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                  <problem.icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {problem.title}
                </h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </div>
            ))}
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <span className="text-sm font-bold text-primary-foreground">FX</span>
            </div>
            <span className="font-semibold text-foreground">AlphaLab</span>
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
        </div>
      </footer>
    </div>
  )
}
