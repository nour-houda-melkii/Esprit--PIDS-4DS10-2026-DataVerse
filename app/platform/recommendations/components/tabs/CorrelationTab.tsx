"use client";

import { TrendingUp, TrendingDown, Activity, BarChart3, Zap, Eye } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { sc } from "../../lib/utils";

export function CorrelationTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const corr = pd.agents.correlation;
  const sig = corr?.signal || "HOLD";
  const c = sc(sig);

  // Parse correlation data
  const confidence = corr?.confidence ?? 0.317;
  const probs = corr?.probs || { buy: 0.299, hold: 0.468, sell: 0.234 };
  const sharpe = corr?.sharpe ?? 0;
  const lastProbaUp = corr?.last_proba_up ?? 0.56;
  const lastRegime = corr?.last_regime ?? 0.102;
  const score = corr?.score ?? 0.458;
  const isAvailable = corr?.available || false;

  // Sharpe interpretation
  const sharpeColor = sharpe > 0.5 ? "text-emerald-400" : sharpe > 0 ? "text-amber-400" : "text-rose-400";
  const sharpeInterpretation = sharpe > 1 ? "Strong uptrend" : sharpe > 0.5 ? "Moderate uptrend" : sharpe > 0 ? "Weak uptrend" : sharpe > -0.5 ? "Weak downtrend" : "Strong downtrend";

  return (
    <div className="space-y-5">
      {/* Signal Overview Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#060e1d]/80 backdrop-blur-sm overflow-hidden">
        <div className={`h-0.5 ${c.bar}`} />
        
        <div className="p-6 space-y-5">
          {/* Header with Signal */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-slate-400" />
                <p className="text-lg font-black text-white">Correlation Analysis</p>
              </div>
              <p className="text-xs text-slate-500">Price movement & trend momentum analysis</p>
            </div>
            <SignalPill s={sig} size="lg" />
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/[0.05]">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Confidence</p>
              <p className={`text-lg font-black ${c.text}`}>{(confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Score</p>
              <p className="text-lg font-black text-white">{(score * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Sharpe Ratio</p>
              <p className={`text-lg font-black ${sharpeColor}`}>{sharpe.toFixed(3)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Trend Strength</p>
              <p className="text-lg font-black text-white">{sharpeInterpretation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Probabilities with Visual Bars */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Signal Probability Distribution</p>
        </div>

        <div className="space-y-4">
          {/* Buy Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Buy Probability</span>
              </div>
              <span className="text-sm font-black text-emerald-400">{(probs.buy * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${probs.buy * 100}%` }}
              />
            </div>
          </div>

          {/* Hold Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-white">Hold Probability</span>
              </div>
              <span className="text-sm font-black text-amber-400">{(probs.hold * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                style={{ width: `${probs.hold * 100}%` }}
              />
            </div>
          </div>

          {/* Sell Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-bold text-white">Sell Probability</span>
              </div>
              <span className="text-sm font-black text-rose-400">{(probs.sell * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-300"
                style={{ width: `${probs.sell * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Price Movement Metrics */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Price Trend Metrics</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Trend Quality */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Trend Quality Score</p>
              <span className={`text-2xl font-black ${sharpeColor}`}>{sharpe.toFixed(3)}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {sharpe > 0 
                ? "The current trend is moving in a positive direction with good momentum."
                : "The current trend is moving downward with momentum concerns."}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-block px-2 py-1 rounded-full font-bold ${sharpe > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                {sharpeInterpretation}
              </span>
            </div>
          </div>

          {/* Upward Movement Likelihood */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">Upward Movement Likelihood</p>
                <p className="text-[10px] text-slate-500 mt-1">How likely the price moves up next</p>
              </div>
              <span className="text-2xl font-black text-blue-400">{(lastProbaUp * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${lastProbaUp * 100}%` }}
              />
            </div>
          </div>

          {/* Current Pattern Continuation */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">Pattern Continuation</p>
                <p className="text-[10px] text-slate-500 mt-1">Likelihood current pattern continues</p>
              </div>
              <span className="text-2xl font-black text-purple-400">{(lastRegime * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${lastRegime * 100}%` }}
              />
            </div>
          </div>

          {/* Overall Strength */}
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">Signal Strength</p>
                <p className="text-[10px] text-slate-500 mt-1">How strong the price movement signal is</p>
              </div>
              <span className="text-2xl font-black text-indigo-400">{(score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${score * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis Summary */}
      <div className="rounded-3xl border p-6" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <p className="text-sm font-black text-white">Correlation Trend Analysis</p>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {sig === "BUY" 
              ? `Strong upward correlation detected. The pair is showing positive momentum with a Sharpe ratio of ${sharpe.toFixed(3)}, indicating the uptrend is well-supported by price patterns. Current regime probability of ${(lastRegime * 100).toFixed(1)}% suggests continuation is likely.`
              : sig === "SELL"
              ? `Strong downward correlation detected. The pair exhibits negative momentum with a Sharpe ratio of ${sharpe.toFixed(3)}, indicating the downtrend has risk-adjusted validity. Regime probability of ${(lastRegime * 100).toFixed(1)}% supports potential reversal or further decline.`
              : `Neutral correlation environment. Price action lacks clear directional conviction with mixed signals. The pair may be in a consolidation phase. Monitor for regime shift signals with up probability at ${(lastProbaUp * 100).toFixed(1)}%.`
            }
          </p>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.1]">
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Signal Type</p>
              <p className="text-sm font-bold text-white">{sig.toUpperCase()}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Conviction</p>
              <p className={`text-sm font-bold ${c.text}`}>{(confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management Section */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Risk Considerations</p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <span className="text-amber-400 font-bold text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-white mb-1">Pattern Change Risk</p>
              <p className="text-xs text-slate-400">The current pattern has {(lastRegime * 100).toFixed(1)}% chance of continuing. If this drops below 50%, be ready for the trend to shift.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <span className="text-blue-400 font-bold text-lg shrink-0">ℹ️</span>
            <div>
              <p className="text-sm font-bold text-white mb-1">Movement Strength</p>
              <p className="text-xs text-slate-400">With a score of {sharpe.toFixed(3)}, the momentum is {sharpe > 0.5 ? "strong" : sharpe > 0 ? "moderate" : "weak"}. Consider position size based on this strength.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <span className="text-purple-400 font-bold text-lg shrink-0">◆</span>
            <div>
              <p className="text-sm font-bold text-white mb-1">Direction Bias</p>
              <p className="text-xs text-slate-400">Up probability is {(lastProbaUp * 100).toFixed(1)}%. If heavily skewed one way, expect significant movement once the pair breaks out.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}