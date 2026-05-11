"use client"
// hooks/use-chatbot-actions.ts

import { useEffect } from "react"
import { useChatbot, ChatbotAction } from "@/components/chatbot/chatbot-provider"

interface Options {
  onNavigate?:          (path: string, reason: string) => void
  onFilterFeed?:        (category: string) => void
  onExplainAgent?:      (agentId: string) => void
  onHighlightPortfolio?:(portfolioName: string) => void
}

export function useChatbotActions(options: Options) {
  const { registerHandler } = useChatbot()

  useEffect(() => {
    const unregister = registerHandler((action: ChatbotAction) => {
      switch (action.type) {
        case "navigate":
          options.onNavigate?.(action.payload.path, action.payload.reason)
          break
        case "filter_news_feed":
          options.onFilterFeed?.(action.payload.category)
          break
        case "explain_agent":
          options.onExplainAgent?.(action.payload.agentId)
          break
        case "highlight_portfolio":
          options.onHighlightPortfolio?.(action.payload.portfolioName)
          break
      }
    })
    return unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}