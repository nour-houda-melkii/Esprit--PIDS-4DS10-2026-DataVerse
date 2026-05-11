import { Wallet } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { GROWTH_STATIC, CONVICTION_STATIC } from "../../lib/constants";
import { fmt } from "../../lib/utils";

interface IPortfolio {
  name: string;
  currencyPairs: string[];
  initialCapital: number;
  currency: string;
  riskLevel: "low" | "medium" | "high";
  tradingStyle: string;
}

export function PortfolioCards({
  portfolios,
  active,
  onSelect,
  liveData,
}: {
  portfolios: IPortfolio[];
  active: number;
  onSelect: (i: number) => void;
  liveData: Record<string, LivePairData>;
}) {
  const riskColor = { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" };
  const riskBorder = { low: "border-emerald-500/25", medium: "border-amber-500/25", high: "border-rose-500/25" };
  const riskBg = { low: "bg-emerald-500/[0.06]", medium: "bg-amber-500/[0.06]", high: "bg-rose-500/[0.06]" };

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {portfolios.map((p, i) => {
        const isActive = i === active;
        const validPairs = p.currencyPairs.filter((x) => liveData[x as Pair] !== undefined) as Pair[];
        const netGrowth =
          validPairs.length > 0
            ? validPairs.reduce((s, pair) => s + (liveData[pair]?.growth ?? GROWTH_STATIC[pair]), 0) / validPairs.length
            : 0;
        const isPos = netGrowth >= 0;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`shrink-0 min-w-[200px] text-left rounded-2xl border p-5 transition-all duration-200 ${
              isActive
                ? "border-blue-500/50 bg-blue-500/[0.07] shadow-lg shadow-blue-500/10"
                : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <Wallet className="h-4 w-4 text-slate-400" />
              </div>
              {isActive && (
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black text-blue-400 tracking-widest">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm font-black text-white mb-1.5 leading-snug">{p.name}</p>
            <div className="flex items-center gap-1.5 mb-4">
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${riskColor[p.riskLevel]} ${
                  riskBorder[p.riskLevel]
                } ${riskBg[p.riskLevel]}`}
              >
                {p.riskLevel.toUpperCase()} RISK
              </span>
              <span className="text-[9px] text-slate-600">{p.tradingStyle}</span>
            </div>
            <div className="flex items-end justify-between pt-3 border-t border-white/[0.05]">
              <div>
                <p className="text-[9px] text-slate-600 mb-0.5">Balance</p>
                <p className="text-base font-black text-white">${fmt(p.initialCapital)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-600 mb-0.5">Expected</p>
                <p className={`text-sm font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {isPos ? "+" : ""}
                  {netGrowth.toFixed(1)}%
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}