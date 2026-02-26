"use client"
// hooks/use-wake-word.ts
// Passively listens for the wake word "ARIA" and triggers a callback.
// Uses Web Speech API continuous recognition — works in Chrome and Edge.

import { useEffect, useRef, useCallback, useState } from "react"

interface UseWakeWordOptions {
  onWake: () => void        // called when "ARIA" is detected
  onCommand?: (text: string) => void  // called with the command after wake word
  enabled?: boolean         // can be toggled off by user
}

export function useWakeWord({ onWake, onCommand, enabled = true }: UseWakeWordOptions) {
  const recognRef    = useRef<any>(null)
  const listeningRef = useRef(false)
  const awakeRef     = useRef(false)   // true = waiting for command after wake word
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [supported,  setSupported]  = useState(false)
  const [active,     setActive]     = useState(false)

  const stop = useCallback(() => {
    recognRef.current?.stop()
    listeningRef.current = false
    awakeRef.current     = false
    setActive(false)
  }, [])

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR || !enabled) return

    const r = new SR()
    r.lang            = "en-US"
    r.continuous      = true       // keep listening
    r.interimResults  = false
    r.maxAlternatives = 3

    r.onstart = () => {
      listeningRef.current = true
      setActive(true)
    }

    r.onresult = (e: any) => {
      // Get all alternatives from the latest result
      const result   = e.results[e.results.length - 1]
      const transcripts: string[] = []
      for (let i = 0; i < result.length; i++) {
        transcripts.push(result[i].transcript.toLowerCase().trim())
      }

      const fullText = transcripts[0] // best match

      // ── Wake word detected ───────────────────────────────────────────────
      // Check if "aria" appears anywhere in any alternative
      const hasWakeWord = transcripts.some(t =>
        /\b(aria|area|arya|areia|ari[ae])\b/.test(t)
      )

      if (hasWakeWord && !awakeRef.current) {
        awakeRef.current = true
        onWake()

        // Extract command if spoken in same utterance:
        // e.g. "ARIA show me crypto news" → command = "show me crypto news"
        const cmdMatch = fullText.match(/\b(?:aria|area|arya)\b[,.]?\s*(.+)/)
        if (cmdMatch && cmdMatch[1] && cmdMatch[1].length > 2) {
          onCommand?.(cmdMatch[1].trim())
          awakeRef.current = false
          return
        }

        // Otherwise wait up to 6 seconds for the command
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          awakeRef.current = false
        }, 6000)
        return
      }

      // ── Command after wake word ──────────────────────────────────────────
      if (awakeRef.current && fullText.length > 1) {
        if (timerRef.current) clearTimeout(timerRef.current)
        awakeRef.current = false
        onCommand?.(fullText.trim())
      }
    }

    r.onerror = (e: any) => {
      // "no-speech" is normal — just restart
      if (e.error === "no-speech" || e.error === "audio-capture") return
      listeningRef.current = false
      setActive(false)
    }

    r.onend = () => {
      // Auto-restart for continuous listening
      listeningRef.current = false
      if (enabled) {
        setTimeout(() => {
          try { r.start() } catch {}
        }, 300)
      }
    }

    recognRef.current = r
    try { r.start() } catch {}
  }, [enabled, onWake, onCommand])

  // Start/stop based on enabled flag and browser support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    setSupported(true)

    if (enabled) {
      start()
    } else {
      stop()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      recognRef.current?.stop()
    }
  }, [enabled, start, stop])

  return { supported, active }
}