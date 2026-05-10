import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Signal } from "../../lib/types";
import { sc } from "../../lib/utils";

export function SignalPill({ s, size = "md" }: { s: Signal; size?: "sm" | "md" | "lg" }) {
  const c = sc(s);
  const Icon = s === "BUY" ? TrendingUp : s === "SELL" ? TrendingDown : Minus;
  const sz = {
    sm: "px-2 py-0.5 text-[9px] gap-1",
    md: "px-3 py-1 text-[11px] gap-1.5",
    lg: "px-4 py-1.5 text-sm gap-2",
  }[size];
  return (
    <span
      className={`inline-flex items-center rounded-full border font-black tracking-widest ${sz} ${c.bg} ${c.border} ${c.text}`}
    >
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {s}
    </span>
  );
}