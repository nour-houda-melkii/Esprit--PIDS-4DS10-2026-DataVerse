import { Signal } from "./types";

export function fmt(n: number, dec = 0) {
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function sc(s: Signal | undefined | null) {
  // Fallback for any invalid signal (undefined, null, or not BUY/SELL/HOLD)
  if (!s || (s !== "BUY" && s !== "SELL" && s !== "HOLD")) {
    return {
      hex: "#f59e0b",
      bar: "bg-amber-500",
      text: "text-amber-400",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      dot: "bg-amber-400",
      glow: "0 0 60px rgba(245,158,11,0.12)",
    };
  }

  const styles = {
    BUY: {
      hex: "#10b981",
      bar: "bg-emerald-500",
      text: "text-emerald-400",
      border: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-400",
      glow: "0 0 60px rgba(16,185,129,0.12)",
    },
    SELL: {
      hex: "#f43f5e",
      bar: "bg-rose-500",
      text: "text-rose-400",
      border: "border-rose-500/40",
      bg: "bg-rose-500/10",
      dot: "bg-rose-400",
      glow: "0 0 60px rgba(244,63,94,0.12)",
    },
    HOLD: {
      hex: "#f59e0b",
      bar: "bg-amber-500",
      text: "text-amber-400",
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      dot: "bg-amber-400",
      glow: "0 0 60px rgba(245,158,11,0.12)",
    },
  };

  return styles[s];
}