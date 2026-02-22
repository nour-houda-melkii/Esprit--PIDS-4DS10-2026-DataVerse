"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"

interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: "top" | "bottom" | "left" | "right"
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: "hero",
    title: "Welcome to FX-AlphaLab",
    description:
      "This is your gateway to AI-powered forex analysis. Our multi-agent system provides comprehensive market insights.",
    targetSelector: "#hero-section",
    position: "bottom",
  },
  {
    id: "problem",
    title: "The Problem We Solve",
    description:
      "Traditional forex analysis is fragmented. We unify multiple perspectives into one intelligent system.",
    targetSelector: "#problem-section",
    position: "top",
  },
  {
    id: "agents",
    title: "Meet Our AI Agents",
    description:
      "Five specialized AI agents work together, each bringing unique expertise to analyze the forex market.",
    targetSelector: "#agents-section",
    position: "top",
  },
  {
    id: "future",
    title: "The Future of Analysis",
    description:
      "See how our platform will transform your trading decisions with explainable AI insights.",
    targetSelector: "#future-section",
    position: "top",
  },
  {
    id: "cta",
    title: "Get Started",
    description:
      "Sign up to be among the first to experience the future of forex analysis when we launch.",
    targetSelector: "#cta-section",
    position: "top",
  },
]

interface TutorialContextType {
  isActive: boolean
  currentStep: number
  totalSteps: number
  currentStepData: TutorialStep | null
  startTutorial: () => void
  endTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
  hasSeenTutorial: boolean
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem("fx-alphalab-tutorial-seen")
    setHasSeenTutorial(seen === "true")
  }, [])

  const startTutorial = useCallback(() => {
    setCurrentStep(0)
    setIsActive(true)
  }, [])

  const endTutorial = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      endTutorial()
    }
  }, [currentStep, endTutorial])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const skipTutorial = useCallback(() => {
    localStorage.setItem("fx-alphalab-tutorial-seen", "true")
    setHasSeenTutorial(true)
    endTutorial()
  }, [endTutorial])

  const currentStepData = isActive ? tutorialSteps[currentStep] : null

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: tutorialSteps.length,
        currentStepData,
        startTutorial,
        endTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        hasSeenTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider")
  }
  return context
}
