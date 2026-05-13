"use client";

import { MessageSquare, TrendingUp, TrendingDown, Eye, BarChart3, Zap, FileText, Network } from "lucide-react";
import { Pair, LivePairData } from "../../lib/types";
import { SignalPill } from "../../components/ui/SignalPill";
import { sc } from "../../lib/utils";

export function SentimentTab({ pair, liveData }: { pair: Pair; liveData: Record<string, LivePairData> }) {
  const pd = liveData[pair];
  const sent = pd.agents.sentiment;
  const sig = sent?.signal || "HOLD";
  const c = sc(sig);

  // Parse sentiment data
  const confidence = sent?.confidence ?? 0;
  const probs = sent?.probs || { buy: 0, hold: 0.5, sell: 0 };
  const articlesUsed = sent?.articles_used ?? 0;
  const modelVotes = sent?.model_votes || {};
  const ensembleInfo = sent?.ensemble_info || {};
  const isAvailable = sent?.available || false;

  // Calculate model consensus
  const modelCount = Object.keys(modelVotes).length;
  const buyVotesCount = Object.values(modelVotes).filter((m: any) => m.buy > m.hold && m.buy > m.sell).length;
  const sellVotesCount = Object.values(modelVotes).filter((m: any) => m.sell > m.hold && m.sell > m.buy).length;
  const holdVotesCount = modelCount - buyVotesCount - sellVotesCount;

  // Model performance labels
  const modelLabels = {
    lr: "Logistic Regression",
    lgb: "LightGBM",
    textcnn: "TextCNN (Deep Learning)",
    bilstm: "BiLSTM (RNN)",
    transformer: "Transformer (BERT-like)"
  };

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
                <MessageSquare className="h-5 w-5 text-slate-400" />
                <p className="text-lg font-black text-white">Sentiment Analysis</p>
              </div>
              <p className="text-xs text-slate-500">NLP-based market sentiment from news articles</p>
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
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Articles</p>
              <p className="text-lg font-black text-blue-400">{articlesUsed}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Method</p>
              <p className="text-sm font-black text-white truncate">{ensembleInfo.method || "Ensemble"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Base Model</p>
              <p className="text-sm font-black text-white truncate">{ensembleInfo.base_method || "Meta-LGB"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Probabilities */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Sentiment Distribution</p>
        </div>

        <div className="space-y-4">
          {/* Buy Sentiment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Bullish Sentiment</span>
              </div>
              <span className="text-sm font-black text-emerald-400">{(probs.buy * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${probs.buy * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {probs.buy > 0.6 ? "Strong bullish bias in news articles" : probs.buy > 0.4 ? "Moderate bullish sentiment detected" : "Limited bullish outlook"}
            </p>
          </div>

          {/* Hold Sentiment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-white">Neutral Sentiment</span>
              </div>
              <span className="text-sm font-black text-amber-400">{(probs.hold * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                style={{ width: `${probs.hold * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {probs.hold > 0.5 ? "Market sentiment remains indecisive" : "Clear directional bias in sentiment"}
            </p>
          </div>

          {/* Sell Sentiment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-bold text-white">Bearish Sentiment</span>
              </div>
              <span className="text-sm font-black text-rose-400">{(probs.sell * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-300"
                style={{ width: `${probs.sell * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {probs.sell > 0.3 ? "Bearish concerns present in news coverage" : "Minimal bearish sentiment"}
            </p>
          </div>
        </div>
      </div>

      {/* NLP Model Performance */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-black/20">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">NLP Model Ensemble</p>
            <span className="ml-auto text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">{modelCount} Models</span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {modelCount > 0 ? (
            Object.entries(modelVotes).map(([modelName, votes]: [string, any]) => {
              const modelSig = votes.buy > votes.hold && votes.buy > votes.sell ? "buy" 
                             : votes.sell > votes.hold && votes.sell > votes.buy ? "sell" 
                             : "hold";
              const modelColor = modelSig === "buy" ? "text-emerald-400" : modelSig === "sell" ? "text-rose-400" : "text-amber-400";
              const modelBg = modelSig === "buy" ? "bg-emerald-500/10 border-emerald-500/20" : modelSig === "sell" ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20";

              return (
                <div key={modelName} className={`rounded-xl border ${modelBg} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-white">{modelLabels[modelName as keyof typeof modelLabels] || modelName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Model vote in ensemble</p>
                    </div>
                    <span className={`text-sm font-black uppercase ${modelColor}`}>
                      {modelSig === "buy" ? "BUY" : modelSig === "sell" ? "SELL" : "HOLD"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Buy */}
                    <div className="rounded-lg bg-white/[0.05] p-2.5 text-center">
                      <p className="text-[9px] text-slate-600 font-bold mb-1">BUY</p>
                      <div className="h-1.5 rounded-full bg-white/[0.1] overflow-hidden mb-1.5">
                        <div 
                          className="h-full bg-emerald-500"
                          style={{ width: `${votes.buy * 100}%` }}
                        />
                      </div>
                      <p className="text-xs font-black text-emerald-400">{(votes.buy * 100).toFixed(0)}%</p>
                    </div>

                    {/* Hold */}
                    <div className="rounded-lg bg-white/[0.05] p-2.5 text-center">
                      <p className="text-[9px] text-slate-600 font-bold mb-1">HOLD</p>
                      <div className="h-1.5 rounded-full bg-white/[0.1] overflow-hidden mb-1.5">
                        <div 
                          className="h-full bg-amber-500"
                          style={{ width: `${votes.hold * 100}%` }}
                        />
                      </div>
                      <p className="text-xs font-black text-amber-400">{(votes.hold * 100).toFixed(0)}%</p>
                    </div>

                    {/* Sell */}
                    <div className="rounded-lg bg-white/[0.05] p-2.5 text-center">
                      <p className="text-[9px] text-slate-600 font-bold mb-1">SELL</p>
                      <div className="h-1.5 rounded-full bg-white/[0.1] overflow-hidden mb-1.5">
                        <div 
                          className="h-full bg-rose-500"
                          style={{ width: `${votes.sell * 100}%` }}
                        />
                      </div>
                      <p className="text-xs font-black text-rose-400">{(votes.sell * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No model data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Model Consensus Summary */}
      {modelCount > 0 && (
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-black text-white">Ensemble Consensus</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-center">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-2">Buy Votes</p>
              <p className="text-2xl font-black text-emerald-400">{buyVotesCount}/{modelCount}</p>
              <p className="text-[10px] text-slate-500 mt-1">{((buyVotesCount / modelCount) * 100).toFixed(0)}% Agreement</p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-center">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-2">Hold Votes</p>
              <p className="text-2xl font-black text-amber-400">{holdVotesCount}/{modelCount}</p>
              <p className="text-[10px] text-slate-500 mt-1">{((holdVotesCount / modelCount) * 100).toFixed(0)}% Agreement</p>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4 text-center">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-2">Sell Votes</p>
              <p className="text-2xl font-black text-rose-400">{sellVotesCount}/{modelCount}</p>
              <p className="text-[10px] text-slate-500 mt-1">{((sellVotesCount / modelCount) * 100).toFixed(0)}% Agreement</p>
            </div>
          </div>
        </div>
      )}

      {/* Article Analysis */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">News Article Source</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Articles Analyzed</p>
              <span className="text-2xl font-black text-blue-400">{articlesUsed}</span>
            </div>
            <p className="text-xs text-slate-400">
              {articlesUsed === 0 
                ? "No articles available for analysis"
                : articlesUsed === 1
                ? "Sentiment based on a single article — low confidence"
                : articlesUsed <= 5
                ? `Analysis based on ${articlesUsed} articles — moderate statistical confidence`
                : `Strong sample size of ${articlesUsed} articles — high statistical confidence in sentiment`
              }
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-sm font-bold text-white mb-3">Ensemble Method</p>
            <p className="text-xs text-slate-400 mb-3">
              {ensembleInfo.method === "article_aggregation"
                ? "Articles are aggregated and classified together, then multiple NLP models vote on the final sentiment."
                : ensembleInfo.method === "voting"
                ? "Each model independently analyzes articles and votes on sentiment direction."
                : "Custom ensemble methodology for robust sentiment prediction."}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
                {ensembleInfo.method || "Ensemble"}
              </span>
              <span className="inline-block px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400">
                {ensembleInfo.base_method || "Meta-LGB"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Interpretation */}
      <div className="rounded-3xl border p-6" style={{ borderColor: `${c.hex}28`, background: "linear-gradient(135deg,#0b1526,#070d1c)", boxShadow: c.glow }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-slate-400" />
          <p className="text-sm font-black text-white">Sentiment Summary</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {sig === "BUY" 
              ? `Strong bullish sentiment detected in news coverage. ${articlesUsed} articles analyzed show predominantly positive outlook for this pair. Market participants are expressing confidence in upside potential, with ${(probs.buy * 100).toFixed(1)}% of sentiment pointing to buy signals.`
              : sig === "SELL"
              ? `Bearish sentiment prevails in news articles. ${articlesUsed} articles reveal negative outlook with ${(probs.sell * 100).toFixed(1)}% sentiment weight on sell signals. Traders and analysts express caution about this pair's prospects.`
              : `Mixed sentiment environment with no clear directional bias. Articles show balanced coverage with ${(probs.hold * 100).toFixed(1)}% neutral sentiment. Market narrative remains indecisive.`
            }
          </p>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.1]">
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Top Sentiment</p>
              <p className={`text-sm font-black ${c.text}`}>{sig.toUpperCase()}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Strength</p>
              <p className="text-sm font-black text-white">{(confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Architecture Info */}
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Network className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-black text-white">Analysis Methods</p>
        </div>

        <div className="space-y-2.5">
          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Pattern Detector (TextCNN)</p>
            <p className="text-xs text-slate-400">Looks for specific patterns and keywords in news articles that indicate market sentiment.</p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Sequence Reader (BiLSTM)</p>
            <p className="text-xs text-slate-400">Reads articles from beginning to end, understanding how ideas connect and build throughout the text.</p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Attention Analyzer (Transformer)</p>
            <p className="text-xs text-slate-400">Focuses on the most important words and phrases to understand the overall message and tone.</p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Traditional Methods</p>
            <p className="text-xs text-slate-400">Classic approaches that check word lists and use simple rules to classify sentiment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}