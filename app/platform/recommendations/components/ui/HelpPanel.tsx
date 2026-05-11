"use client";

import { useEffect } from "react";
import { X, LayoutDashboard, Activity, Brain, FlaskConical, Globe } from "lucide-react";

const REAL_API_BASE = "https://pidsfx-app.greenforest-6c56574d.spaincentral.azurecontainerapps.io";

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-[#060d1b] border-l border-white/[0.08] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <p className="text-sm font-black text-white">How This Works</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] hover:border-white/[0.2] transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            All signals are fetched <span className="font-bold text-emerald-400">live</span> from your real AI models running on Azure. No static data — every signal, confidence score, and agent vote is from your actual prediction system.
          </p>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">⚡ Real Model Pipeline</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Signals come from your Central Brain v7: Sentiment (5-model stacking: LR, LightGBM, TextCNN, BiLSTM, DistilBERT), Correlation (XGBoost + Markov regime), Geopolitical (GDELT-based MLP/GB/RF), Technical (RF + HGB + LR multi-timeframe), and Macro (LLaMA-3.1-70B).
            </p>
          </div>
          {[
            { icon: LayoutDashboard, title: "Overview", desc: "Live signal, conviction score from real model confidence, capital projection, and pair comparison all driven by your Azure API." },
            { icon: Activity, title: "Technical", desc: "Signal radar built from live agent confidences. Timeframe votes come directly from your technical agent's tf_votes output." },
            { icon: Brain, title: "Reasoning", desc: "Every sentiment sub-model vote (LR, LightGBM, TextCNN, BiLSTM, DistilBERT) shown live. LLaMA explanation displayed if available." },
            { icon: FlaskConical, title: "Scenarios", desc: "AI-generated what-if scenarios tailored to your live signal and conviction level." },
            { icon: Globe, title: "Macro", desc: "Live macro agent summary and drivers. Rate differential and economic context always shown." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                <item.icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">API Endpoint</p>
            <p className="text-xs text-slate-400 font-mono break-all">{REAL_API_BASE}/predict?pair=EURUSD</p>
          </div>
        </div>
      </div>
    </div>
  );
}