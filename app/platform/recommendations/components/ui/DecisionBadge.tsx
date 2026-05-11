import { CheckCircle, AlertTriangle, Shield, Minus } from "lucide-react";

type Decision = "PROCEED" | "REDUCE" | "SKIP" | "HOLD";

export function DecisionBadge({ d }: { d: Decision }) {
  const m = {
    PROCEED: { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", I: CheckCircle },
    REDUCE: { cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", I: AlertTriangle },
    SKIP: { cls: "bg-rose-500/10 border-rose-500/30 text-rose-400", I: Shield },
    HOLD: { cls: "bg-slate-500/10 border-slate-500/30 text-slate-400", I: Minus },
  }[d];
  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black ${m.cls}`}>
      <m.I className="h-3.5 w-3.5" />
      {d}
    </span>
  );
}