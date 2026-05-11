"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { agents } from "@/lib/agents"
import { useTutorial } from "@/lib/tutorial-context"
import {
  ArrowLeft,
  ArrowRight,
  Play,
  CheckCircle2,
  Circle,
  Sparkles,
  Brain,
  Zap,
  Target,
  LineChart,
} from "lucide-react"
import { cn } from "@/lib/utils"

const tutorialSections = [
  {
    id: "intro",
    title: "Welcome to FX-AlphaLab",
    icon: Sparkles,
    content: {
      heading: "The Future of Forex Analysis",
      description:
        "FX-AlphaLab is a revolutionary multi-agent AI platform designed to provide comprehensive, explainable forex market analysis. Unlike traditional black-box trading systems, our platform shows you exactly why each recommendation is made.",
      highlights: [
        "Five specialized AI agents working in harmony",
        "Real-time market analysis across multiple dimensions",
        "Explainable AI with clear reasoning for every signal",
        "Unified conviction scores combining all perspectives",
      ],
    },
  },
  {
    id: "agents",
    title: "Meet the AI Agents",
    icon: Brain,
    content: {
      heading: "Five Specialized Perspectives",
      description:
        "Each agent brings unique expertise to analyze the forex market from a different angle. Together, they provide a comprehensive view that no single approach could achieve.",
      highlights: agents.map(
        (a) => `${a.shortName}: ${a.description.slice(0, 80)}...`
      ),
    },
  },
  {
    id: "signals",
    title: "Understanding Signals",
    icon: Zap,
    content: {
      heading: "How Signals Are Generated",
      description:
        "When our agents detect a potential opportunity, they generate a signal with a conviction score from -100 (strong sell) to +100 (strong buy). Each signal includes detailed reasoning from every agent.",
      highlights: [
        "Conviction scores combine all agent perspectives",
        "Individual agent contributions are clearly shown",
        "Historical accuracy is tracked for transparency",
        "Risk levels are assessed alongside opportunities",
      ],
    },
  },
  {
    id: "analysis",
    title: "Reading the Analysis",
    icon: LineChart,
    content: {
      heading: "Making Sense of the Data",
      description:
        "The platform presents analysis in an intuitive format. You will see the unified recommendation at a glance, with the ability to dive deeper into each agent contribution when needed.",
      highlights: [
        "Unified dashboard shows the big picture",
        "Click any agent to see their detailed reasoning",
        "Historical performance helps gauge reliability",
        "Alerts notify you of high-conviction opportunities",
      ],
    },
  },
  {
    id: "action",
    title: "Taking Action",
    icon: Target,
    content: {
      heading: "From Analysis to Decision",
      description:
        "FX-AlphaLab provides analysis and insights, empowering you to make informed trading decisions. We believe in augmenting human judgment, not replacing it.",
      highlights: [
        "Analysis is educational, not financial advice",
        "Use insights to inform your own strategy",
        "Combine AI analysis with your experience",
        "Track your decisions to improve over time",
      ],
    },
  },
]

export default function TutorialPage() {
  const [activeSection, setActiveSection] = useState(0)
  const { startTutorial } = useTutorial()

  const currentSection = tutorialSections[activeSection]
  const Icon = currentSection.icon

  return (
    <div className="relative min-h-screen px-6 pt-24 pb-12 overflow-hidden">
      {/* Video Background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="https://res.cloudinary.com/dcfad76uv/video/upload/v1771803571/testtutorial_exv7qe.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-foreground">
            How FX-AlphaLab Works
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Learn how our multi-agent AI system analyzes the forex market and
            generates explainable trading insights.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            {tutorialSections.map((section, index) => {
              const SectionIcon = section.icon
              const isActive = index === activeSection
              const isCompleted = index < activeSection

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-[#1e293b]/50 hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-primary/20"
                        : isCompleted
                        ? "bg-accent/20"
                        : "bg-[#334155]/50"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    ) : isActive ? (
                      <SectionIcon className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              )
            })}

            {/* Interactive Tour Button */}
            <div className="mt-6 pt-6 border-t border-[#334155]/50">
              <Button
                onClick={startTutorial}
                variant="outline"
                className="w-full gap-2 bg-transparent"
              >
                <Play className="h-4 w-4" />
                Start Interactive Tour
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Take a guided tour of the homepage
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="rounded-2xl border border-[#334155]/50 bg-[#1e293b]/30 p-8 lg:p-12">
            {/* Section icon and badge */}
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Step {activeSection + 1} of {tutorialSections.length}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {currentSection.content.heading}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              {currentSection.content.description}
            </p>

            {/* Highlights */}
            <div className="mb-8 space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Key Points
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {currentSection.content.highlights.map((highlight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-[#334155]/30 bg-[#0f172a]/30 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-[#334155]/50 pt-8">
              <Button
                variant="outline"
                onClick={() =>
                  setActiveSection(Math.max(0, activeSection - 1))
                }
                disabled={activeSection === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {activeSection === tutorialSections.length - 1 ? (
                <Button asChild className="gap-2">
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setActiveSection(
                      Math.min(tutorialSections.length - 1, activeSection + 1)
                    )
                  }
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
