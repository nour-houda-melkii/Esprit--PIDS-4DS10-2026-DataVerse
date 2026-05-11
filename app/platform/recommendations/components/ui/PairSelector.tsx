import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "./SignalPill";
import { LiveBadge } from "./LiveBadge";
import { FLAGS, PRICE, CHANGE, TIMEFRAME } from "../../lib/constants";
import { sc } from "../../lib/utils";
import { RefreshCw, WifiOff } from "lucide-react";

export function PairSelector({
  pairs,
  active,
  onChange,
  perPair,
  liveData,
  onRefetch,
}: {
  pairs: Pair[];
  active: Pair;
  onChange: (p: Pair) => void;
  perPair: number;
  liveData: Record<string, LivePairData>;
  onRefetch: (p: Pair) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {pairs.map((p, idx) => {
        const pd = liveData[p];
        const s = pd.signal;
        const c = sc(s);
        const isActive = p === active;
        const [base, quote] = p.split("/");
        const g = pd.growth;
        const conv = pd.conviction;
        const change = CHANGE[p];
        const gain = perPair * (g / 100);

        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`group relative text-left rounded-2xl border transition-all duration-200 overflow-hidden ${
              isActive ? `${c.border} shadow-lg` : "border-white/[0.07] hover:border-white/[0.15]"
            }`}
            style={
              isActive
                ? { background: `linear-gradient(135deg, ${c.hex}14 0%, #070d1c 100%)`, boxShadow: c.glow }
                : { background: "rgba(255,255,255,0.02)" }
            }
          >
            {isActive && <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar}`} />}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex shrink-0">
                  <span className="text-2xl leading-none">{FLAGS[base]}</span>
                  <span className="text-2xl leading-none -ml-1">{FLAGS[quote]}</span>
                </div>
                <div>
                  <p className={`font-mono text-sm font-black leading-none ${isActive ? c.text : "text-white"}`}>
                    {p}
                  </p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{TIMEFRAME[p]}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <SignalPill s={s} size="sm" />
                  {pd.loading && <RefreshCw className="h-2.5 w-2.5 text-blue-400 animate-spin" />}
                  {pd.error && <WifiOff className="h-2.5 w-2.5 text-rose-400" />}
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-black text-white">{PRICE[p]}</p>
                  <p className={`text-[10px] font-mono ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] text-slate-600 uppercase tracking-wider">Conviction</span>
                  <span className={`text-[10px] font-black ${isActive ? c.text : "text-slate-400"}`}>{conv}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.bar} transition-all duration-700`}
                    style={{ width: `${conv}%`, opacity: isActive ? 1 : 0.45 }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-3 border-t border-white/[0.05]">
                {[
                  { label: "Capital", value: `$${Math.round(perPair / 1000)}k` },
                  { label: "Move", value: `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`, colored: true, pos: g >= 0 },
                  {
                    label: "P&L",
                    value: `${gain >= 0 ? "+" : "−"}$${
                      Math.abs(gain) < 1000 ? Math.abs(gain).toFixed(0) : (Math.abs(gain) / 1000).toFixed(1) + "k"
                    }`,
                    colored: true,
                    pos: gain >= 0,
                  },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[8px] text-slate-600 mb-0.5">{stat.label}</p>
                    <p
                      className={`text-[10px] font-black ${
                        "colored" in stat && stat.colored
                          ? stat.pos
                            ? "text-emerald-400"
                            : "text-rose-400"
                          : "text-white"
                      }`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}