"use client";

import { AlertTriangle, Globe, TrendingDown, TrendingUp, Eye, Zap } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { sc } from "../../lib/utils";
import { FLAGS } from "../../lib/constants";

export function GeopoliticalTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const geo = pd.agents.geopolitical;
  const sig = geo?.signal || "HOLD";
  const c = sc(sig);
  const [base, quote] = pair.split("/");

  // Parse geopolitical data
  const confidence = geo?.confidence ?? 0.333;
  const probs = geo?.probs || { buy: 0.333, hold: 0.334, sell: 0.333 };
  const modelVotes = geo?.model_votes || {};
  const agreement = geo?.agreement || "N/A";
  const strength = geo?.strength || "N/A";
  const closePrice = geo?.close_price || "—";
  const eventDate = geo?.date || "No recent events";
  const isAvailable = geo?.available || false;

  // Calculate agreement percentage if models voted
  const modelCount = Object.keys(modelVotes).length;
  const buyVotes = Object.values(modelVotes).filter((m: any) => m.buy > m.hold && m.buy > m.sell).length;
  const agreementScore = modelCount > 0 ? Math.round((buyVotes / modelCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Availability Status */}
      {!isAvailable && (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400">Geopolitical Analysis Unavailable</p>
              <p className="text-xs text-slate-400 mt-1">No geopolitical events detected or monitored for {pair} at this time. Monitor global tensions, trade agreements, and political developments that could impact this pair.</p>
            </div>
          </div>
        </div>
      )}

      {/* Signal Overview Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#060e1d]/80 backdrop-blur-sm overflow-hidden">
        <div className={`h-0.5 ${c.bar}`} />
        
        <div className="p-6 space-y-5">
          {/* Header with Signal */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-slate-400" />
                <p className="text-lg font-black text-white">Geopolitical Signal</p>
              </div>
              <p className="text-xs text-slate-500">Global events & political risk analysis</p>
            </div>
            <SignalPill s={sig} size="lg" />
          </div>

          {/* Confidence & Metrics Grid */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/[0.05]">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Confidence</p>
              <p className={`text-lg font-black ${c.text}`}>{(confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Agreement</p>
              <p className="text-lg font-black text-white">{agreement === "N/A" ? "—" : agreement}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Strength</p>
              <p className="text-lg font-black text-white">{strength === "N/A" ? "—" : strength}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Last Close</p>
              <p className="text-lg font-black text-white">{closePrice}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Probabilities */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Signal Probabilities</p>
        </div>

        <div className="space-y-3">
          {/* Buy Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Buy Signal</span>
              </div>
              <span className="text-sm font-black text-emerald-400">{(probs.buy * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${probs.buy * 100}%` }}
              />
            </div>
          </div>

          {/* Hold Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-white">Hold Signal</span>
              </div>
              <span className="text-sm font-black text-amber-400">{(probs.hold * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${probs.hold * 100}%` }}
              />
            </div>
          </div>

          {/* Sell Probability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-bold text-white">Sell Signal</span>
              </div>
              <span className="text-sm font-black text-rose-400">{(probs.sell * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${probs.sell * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model Votes Breakdown */}
      {modelCount > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Model Consensus</p>
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">{agreementScore}% Agreement</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(modelVotes).map(([modelName, votes]: [string, any]) => {
              const modelSig = votes.buy > votes.hold && votes.buy > votes.sell ? "buy" 
                             : votes.sell > votes.hold && votes.sell > votes.buy ? "sell" 
                             : "hold";
              const modelColor = modelSig === "buy" ? "text-emerald-400" : modelSig === "sell" ? "text-rose-400" : "text-amber-400";
              
              return (
                <div key={modelName} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-white capitalize">{modelName.toUpperCase()}</p>
                    <span className={`text-xs font-black uppercase ${modelColor}`}>
                      {modelSig === "buy" ? "BUY" : modelSig === "sell" ? "SELL" : "HOLD"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-slate-600 mb-1">Buy</p>
                      <p className="font-bold text-emerald-400">{(votes.buy * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-600 mb-1">Hold</p>
                      <p className="font-bold text-amber-400">{(votes.hold * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-600 mb-1">Sell</p>
                      <p className="font-bold text-rose-400">{(votes.sell * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Information */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Recent Event</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 space-y-3">
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Event Date</p>
            <p className="text-sm font-bold text-white">{eventDate}</p>
          </div>
          <div className="border-t border-white/[0.06] pt-3">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">Close Price</p>
            <p className="text-lg font-black text-white">{closePrice}</p>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="rounded-3xl border p-6" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
          <p className="text-sm font-black text-white">Geopolitical Risk Assessment</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {sig === "BUY" 
              ? `Geopolitical factors favour ${base}. Current global tensions and political developments are creating opportunities for upside movement. Monitor {base} political developments closely.`
              : sig === "SELL"
              ? `Geopolitical headwinds suggest downside risk for {pair}. Global tensions and political uncertainty are pressuring the pair lower. Watch for escalating risks that could accelerate declines.`
              : `Geopolitical environment remains neutral with no clear directional bias. Global tensions are balanced by counteracting factors. Stay vigilant for unexpected political developments that could shift the outlook.`
            }
          </p>
          
          <div className="border-t border-white/[0.1] pt-3 mt-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Key Monitoring Areas</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Central bank policy announcements and statements</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-blue-400 shrink-0">•</span>
                <span>International trade and tariff negotiations</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Global tensions and geopolitical flashpoints</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-blue-400 shrink-0">•</span>
                <span>Political elections and government transitions</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}