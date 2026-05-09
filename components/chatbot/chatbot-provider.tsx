"use client"
// components/chatbot/chatbot-provider.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

export type ChatbotAction =
  | { type: "navigate";           payload: { path: string; reason: string } }
  | { type: "filter_news_feed";   payload: { category: string } }
  | { type: "explain_agent";      payload: { agentId: string } }
  | { type: "highlight_portfolio";payload: { portfolioName: string } }

type ActionHandler = (action: ChatbotAction) => void

interface ChatbotContextType {
  registerHandler: (handler: ActionHandler) => () => void
  dispatch:        (action: ChatbotAction) => void
}

const ChatbotContext = createContext<ChatbotContextType | null>(null)

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [handlers, setHandlers] = useState<ActionHandler[]>([])

  const registerHandler = useCallback((handler: ActionHandler) => {
    setHandlers((prev) => [...prev, handler])
    return () => setHandlers((prev) => prev.filter((h) => h !== handler))
  }, [])

  const dispatch = useCallback(
    (action: ChatbotAction) => {
      handlers.forEach((h) => h(action))
    },
    [handlers]
  )

  return (
    <ChatbotContext.Provider value={{ registerHandler, dispatch }}>
      {children}
    </ChatbotContext.Provider>
  )
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext)
  if (!ctx) throw new Error("useChatbot must be used within ChatbotProvider")
  return ctx
}