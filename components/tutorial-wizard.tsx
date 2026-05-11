"use client"

import { useEffect, useState, useCallback } from "react"
import { useTutorial } from "@/lib/tutorial-context"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HighlightPosition {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialWizard() {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorial()

  const [highlightPos, setHighlightPos] = useState<HighlightPosition | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })

  const calculatePositions = useCallback(() => {
    if (!currentStepData) return

    const element = document.querySelector(currentStepData.targetSelector)
    if (!element) {
      // If element not found, show tooltip in center
      setHighlightPos(null)
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 175,
      })
      return
    }

    const rect = element.getBoundingClientRect()
    const padding = 16

    setHighlightPos({
      top: rect.top + window.scrollY - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })

    // Calculate tooltip position based on the step's position preference
    const tooltipWidth = 350
    const tooltipHeight = 180
    let tooltipTop = 0
    let tooltipLeft = 0

    switch (currentStepData.position) {
      case "top":
        tooltipTop = rect.top + window.scrollY - tooltipHeight - padding - 20
        tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case "bottom":
        tooltipTop = rect.bottom + window.scrollY + padding + 20
        tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case "left":
        tooltipTop = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2
        tooltipLeft = rect.left - tooltipWidth - padding - 20
        break
      case "right":
        tooltipTop = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2
        tooltipLeft = rect.right + padding + 20
        break
    }

    // Keep tooltip within viewport
    tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 20))
    tooltipTop = Math.max(100, tooltipTop)

    setTooltipPos({ top: tooltipTop, left: tooltipLeft })

    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [currentStepData])

  useEffect(() => {
    if (isActive && currentStepData) {
      // Small delay to allow page to render
      const timer = setTimeout(calculatePositions, 300)
      return () => clearTimeout(timer)
    }
  }, [isActive, currentStepData, calculatePositions])

  useEffect(() => {
    if (isActive) {
      window.addEventListener("resize", calculatePositions)
      return () => window.removeEventListener("resize", calculatePositions)
    }
  }, [isActive, calculatePositions])

  if (!isActive || !currentStepData) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with cutout */}
      <div className="absolute inset-0">
        <svg className="h-full w-full">
          <defs>
            <mask id="tutorial-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightPos && (
                <rect
                  x={highlightPos.left}
                  y={highlightPos.top}
                  width={highlightPos.width}
                  height={highlightPos.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.85)"
            mask="url(#tutorial-mask)"
          />
        </svg>
      </div>

      {/* Highlight border */}
      {highlightPos && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-primary shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          style={{
            top: highlightPos.top,
            left: highlightPos.left,
            width: highlightPos.width,
            height: highlightPos.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          "absolute w-[350px] rounded-xl border border-[#334155] bg-[#1e293b]/95 p-6 shadow-2xl backdrop-blur-sm",
          "animate-in fade-in-0 zoom-in-95 duration-300"
        )}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={skipTutorial}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-[#334155] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress indicator */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= currentStep ? "bg-primary" : "bg-[#334155]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {currentStepData.title}
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {currentStepData.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipTutorial}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip Tour
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-1 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={nextStep} className="gap-1">
              {currentStep === totalSteps - 1 ? "Finish" : "Next"}
              {currentStep !== totalSteps - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
