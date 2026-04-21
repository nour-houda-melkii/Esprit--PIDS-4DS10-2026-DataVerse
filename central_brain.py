"""
FX-ALPHALAB — CENTRAL BRAIN v6
================================
Orchestrates all five agents and produces the final signal.

Agents
------
  predict_sentiment.py          → SentimentPredictor    (5-model NLP stack)
  predict_correlation.py        → CorrelationPredictor   (XGBoost + Markov regime)
  predict_geopolitical.py       → GeopoliticalPredictor  (MLP + GB + RF, GDELT features)
  predict_technical.py          → TechnicalPredictor     (RF + HGB + LR, multi-timeframe)
  predict_macro.py              → MacroPredictor         (LLM macro/news scoring, no models)

Decision
--------
  MetaModel (Logistic Regression stacker, 15-d input: 5 agents × 3 probs)
  Backward-compatible with 12-d, 9-d, and 6-d legacy models.
  Weighted rule-based fallback:
      sent=0.30, corr=0.20, geo=0.15, tech=0.15, macro=0.20

LLM
---
  LLaMA-3.1-70B via TokenFactory for a plain-English explanation.

Usage
-----
    python central_brain.py --pair EURUSD
    python central_brain.py --pair EURUSD --no-llm
    python central_brain.py --pair EURUSD --text "ECB raises rates"
    python central_brain.py --train
"""
from __future__ import annotations
import sys
from predict_technical import EnsembleModel

sys.modules['__main__'].EnsembleModel = EnsembleModel
import argparse, json, os, sys, warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

warnings.filterwarnings("ignore")

# ── colour ────────────────────────────────────────────────────────────────────
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    G=Fore.GREEN; R=Fore.RED; Y=Fore.YELLOW; C=Fore.CYAN; B=Style.BRIGHT; X=Style.RESET_ALL
except ImportError:
    G=R=Y=C=B=X=""

import numpy as np
import joblib

# ── agent imports ─────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

# EnsembleModel must be importable before joblib.load() can deserialise
# the technical-agent .pkl files — register it in sys.modules once here.
from predict_technical import EnsembleModel as _EnsembleModel          # noqa: F401

from predict_sentiment    import SentimentPredictor,   fetch_news
from predict_correlation  import CorrelationPredictor
from predict_geopolitical import GeopoliticalPredictor
from predict_technical    import TechnicalPredictor
from predict_macro        import MacroPredictor

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR     = Path(__file__).parent
MODELS_DIR   = BASE_DIR / "models"
HISTORY_FILE = BASE_DIR / "history.json"
LOG_FILE     = BASE_DIR / "central_brain.log"

LLAMA_BASE_URL = "https://tokenfactory.esprit.tn/api"
LLAMA_MODEL    = "hosted_vllm/Llama-3.1-70B-Instruct"
LLAMA_API_KEY  = os.environ.get("TOKENFACTORY_KEY", "")

PAIRS: Dict[str,str] = {
    "EURUSD":"EUR", "GBPUSD":"GBP", "USDJPY":"USD",
    "USDCHF":"USD", "EURJPY":"EUR", "GBPJPY":"GBP",
}

SIGNAL_TO_INT = {"buy":0, "hold":1, "sell":2}
INT_TO_SIGNAL = {0:"buy",  1:"hold",  2:"sell"}

# ══════════════════════════════════════════════════════════════════════════════
# META-MODEL
# ══════════════════════════════════════════════════════════════════════════════
class MetaModel:
    """
    Logistic Regression stacker trained on past agent outputs.

    Input dimensions (backward-compatible):
        15-d  sent(3)+corr(3)+geo(3)+tech(3)+macro(3)  ← v6 current
        12-d  sent(3)+corr(3)+geo(3)+tech(3)           ← v5 legacy
         9-d  sent(3)+corr(3)+geo(3)                   ← v4 legacy
         6-d  sent(3)+corr(3)                          ← v3 legacy
    Output: (N, 3) — [P(buy), P(hold), P(sell)]
    """
    META_PATH    = MODELS_DIR / "meta_model.pkl"
    META_PATH_V5 = MODELS_DIR / "meta_model_v5.pkl"
    META_PATH_V4 = MODELS_DIR / "meta_model_v4.pkl"
    META_PATH_V3 = MODELS_DIR / "meta_model_v3.pkl"

    def __init__(self):
        self.model     = None
        self.input_dim = 15

        for path, dim, label in [
            (self.META_PATH,    None, ""),
            (self.META_PATH_V5, 12,   " (v5 legacy, no macro)"),
            (self.META_PATH_V4,  9,   " (v4 legacy, no tech/macro)"),
            (self.META_PATH_V3,  6,   " (v3 legacy, sent+corr only)"),
        ]:
            if path.exists():
                self.model = joblib.load(path)
                if dim is None:
                    try:
                        self.input_dim = self.model.coef_.shape[1]
                    except AttributeError:
                        self.input_dim = 15
                    col = G
                else:
                    self.input_dim = dim
                    col = Y
                print(f"  {col}  Meta-model loaded  ({self.input_dim}-d input){label}.{X}")
                return

        print(f"  {Y}  No meta-model yet — using rule-based fallback.{X}")

    def predict(self, sent: np.ndarray, corr: np.ndarray, geo: np.ndarray,
                tech: np.ndarray, macro: np.ndarray) -> Optional[np.ndarray]:
        if self.model is None:
            return None
        chunks = {
            15: [sent, corr, geo, tech, macro],
            12: [sent, corr, geo, tech],
             9: [sent, corr, geo],
             6: [sent, corr],
        }
        vecs = chunks.get(self.input_dim, [sent, corr, geo, tech, macro])
        return self.model.predict_proba(
            np.concatenate(vecs).reshape(1, -1))[0]

    def train(self, history: List[Dict]):
        from sklearn.linear_model import LogisticRegression
        neutral = [1/3, 1/3, 1/3]
        X_rows, y_rows = [], []
        for h in history:
            if "sent_probs" not in h or "true_label" not in h:
                continue
            X_rows.append(np.concatenate([
                h["sent_probs"],
                h["corr_probs"],
                np.array(h.get("geo_probs",   neutral)),
                np.array(h.get("tech_probs",  neutral)),
                np.array(h.get("macro_probs", neutral)),
            ]))
            y_rows.append(SIGNAL_TO_INT[h["true_label"]])

        if len(X_rows) < 10:
            print(f"{Y}  Need ≥10 labelled samples. Have {len(X_rows)}.{X}")
            return

        X_arr, y_arr = np.array(X_rows), np.array(y_rows)
        mdl = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced",
                                 solver="lbfgs", multi_class="multinomial",
                                 random_state=42)
        mdl.fit(X_arr, y_arr)
        self.model     = mdl
        self.input_dim = X_arr.shape[1]

        if self.META_PATH.exists():
            import shutil
            shutil.copy(self.META_PATH, self.META_PATH_V5)

        self.META_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(mdl, self.META_PATH)
        print(f"{G}  Meta-model (15-d) trained on {len(X_arr)} samples → {self.META_PATH}{X}")


# ══════════════════════════════════════════════════════════════════════════════
# RULE-BASED FALLBACK
# ══════════════════════════════════════════════════════════════════════════════
def rule_based_decision(
    sent: Dict, corr: Dict, geo: Dict, tech: Dict, macro: Dict
) -> Tuple[str, float, str]:
    """
    Weighted vote across available agents.
    Base weights: sent=0.30 corr=0.20 geo=0.15 tech=0.15 macro=0.20
    Unavailable agent weight redistributed proportionally.
    """
    BASE_W = {"sent":0.30, "corr":0.20, "geo":0.15, "tech":0.15, "macro":0.20}
    agents = {
        "sent":  (sent["signal"],  sent["confidence"],   True),
        "corr":  (corr["signal"],  corr["confidence"],   corr.get("available",  True)),
        "geo":   (geo["signal"],   geo["confidence"],    geo.get("available",   False)),
        "tech":  (tech["signal"],  tech["confidence"],   tech.get("available",  False)),
        "macro": (macro["signal"], macro["confidence"],  macro.get("available", False)),
    }

    avail = {k: (sig, conf) for k, (sig, conf, ok) in agents.items() if ok}
    if not avail:
        return "hold", 0.20, "No agents available — defaulting to HOLD."

    total_w = sum(BASE_W[k] for k in avail)
    weights  = {k: BASE_W[k] / total_w for k in avail}

    votes = {"buy": 0.0, "hold": 0.0, "sell": 0.0}
    for k, (sig, conf) in avail.items():
        votes[sig] += weights[k] * conf

    top_sig   = max(votes, key=votes.get)
    top_score = votes[top_sig]
    sigs      = [s for s, _ in avail.values()]

    if len(set(sigs)) == 1 and sigs[0] != "hold":
        return sigs[0], min(top_score * 1.2, 0.95), \
               f"All {len(sigs)} agents agree — strong consensus."

    if top_score > 0.35:
        active = ", ".join(avail.keys())
        return top_sig, float(top_score), \
               f"Weighted decision ({active}): {top_sig.upper()} leads."

    return "hold", 0.25, "No clear consensus — defaulting to HOLD."


# ══════════════════════════════════════════════════════════════════════════════
# LLM EXPLAINER
# ══════════════════════════════════════════════════════════════════════════════
def llama_explain(pair: str, signal: str, confidence: float,
                  sent: Dict, corr: Dict, geo: Dict, tech: Dict, macro: Dict,
                  reason: str, api_key: str) -> str:

    geo_line = (
        f"- Geopolitical : {geo['signal'].upper()} ({geo['confidence']*100:.1f}%) "
        f"— {geo.get('agreement','?')} ({geo.get('strength','?')} strength)"
        if geo.get("available") else "- Geopolitical : unavailable"
    )
    tf_summary = ""
    if tech.get("available") and tech.get("tf_votes"):
        tf_parts = [f"{tf}={v['buy']*100:.0f}%↑" for tf, v in tech["tf_votes"].items()]
        tf_summary = ", ".join(tf_parts)
    tech_line = (
        f"- Technical    : {tech['signal'].upper()} ({tech['confidence']*100:.1f}%)  [{tf_summary}]"
        if tech.get("available") else "- Technical    : unavailable"
    )
    macro_line = (
        f"- Macro        : {macro['signal'].upper()} ({macro['confidence']*100:.1f}%) "
        f"score={macro.get('pair_score',0):+.3f}"
        if macro.get("available") else "- Macro        : unavailable"
    )

    parts_fb = [
        f"Sentiment: {sent['signal'].upper()}",
        f"Correlation: {corr['signal'].upper()}",
        f"Geopolitical: {geo['signal'].upper()}"  if geo.get("available")   else "Geo: N/A",
        f"Technical: {tech['signal'].upper()}"    if tech.get("available")  else "Tech: N/A",
        f"Macro: {macro['signal'].upper()}"       if macro.get("available") else "Macro: N/A",
    ]

    if not api_key:
        return (f"Signal: {signal.upper()} ({confidence*100:.1f}% confidence) — "
                + " | ".join(parts_fb) + ".")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=LLAMA_BASE_URL)
        prompt = (
            f"You are a professional FX analyst. Summarize this trading signal in 2-3 sentences. "
            f"Be concise and actionable.\n\n"
            f"Pair: {pair}\n"
            f"Final Signal: {signal.upper()} (confidence: {confidence*100:.1f}%)\n"
            f"Decision reason: {reason}\n\n"
            f"Agent votes:\n"
            f"- Sentiment    : {sent['signal'].upper()} ({sent['confidence']*100:.1f}%) "
            f"— {sent.get('articles_used',0)} articles\n"
            f"- Correlation  : {corr['signal'].upper()} ({corr['confidence']*100:.1f}%) "
            f"— Sharpe {corr.get('sharpe',0):.2f}\n"
            f"{geo_line}\n{tech_line}\n{macro_line}\n\n"
            f"Write 2-3 sentences for a trading dashboard. Do not mention AI."
        )
        resp = client.chat.completions.create(
            model=LLAMA_MODEL,
            messages=[
                {"role": "system", "content": "You are a concise, professional FX market analyst."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.4, max_tokens=150,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return (f"{signal.upper()} signal ({confidence*100:.1f}%) — "
                + " | ".join(parts_fb) + ".")


# ══════════════════════════════════════════════════════════════════════════════
# CENTRAL BRAIN
# ══════════════════════════════════════════════════════════════════════════════
class CentralBrain:
    def __init__(self, llama_api_key: str = LLAMA_API_KEY):
        print(f"\n{B}{'='*64}")
        print("   FX-ALPHALAB  —  CENTRAL BRAIN v6")
        print("   Sentiment   (5-model NLP)")
        print("   Correlation (XGBoost + Markov)")
        print("   Geopolitical(MLP/GB/RF · GDELT)")
        print("   Technical   (RF/HGB/LR · multi-timeframe)")
        print("   Macro       (LLM news scoring · no models)")
        print(f"{'='*64}{X}\n")

        self.api_key = llama_api_key

        print(f"{B}[1/6] Loading Sentiment Agent...{X}")
        self.sentiment = SentimentPredictor(MODELS_DIR / "sentiment_agent")

        print(f"\n{B}[2/6] Loading Correlation Agent...{X}")
        self.correlation = CorrelationPredictor(MODELS_DIR / "correlation_agent")

        print(f"\n{B}[3/6] Loading Geopolitical Agent...{X}")
        self.geopolitical = GeopoliticalPredictor(
            models_dir=MODELS_DIR / "geopolitical_agent",
            data_path=BASE_DIR / "data" / "processed" / "fx_geopolitical_features.csv",
        )

        print(f"\n{B}[4/6] Loading Technical Agent...{X}")
        self.technical = TechnicalPredictor(MODELS_DIR / "technical_agent")

        print(f"\n{B}[5/6] Loading Macro Agent...{X}")
        self.macro = MacroPredictor(api_key=llama_api_key)

        print(f"\n{B}[6/6] Loading Meta-Model...{X}")
        self.meta = MetaModel()

        print(f"\n{G}{B}Central Brain ready.{X}\n")

    # ── main predict ──────────────────────────────────────────────────────────
    def predict(self, pair: str,
                manual_text: Optional[str] = None,
                use_llm: bool = True) -> Dict:

        pair     = pair.upper().replace("/", "").replace("-", "")
        currency = PAIRS.get(pair, pair[:3])

        print(f"\n{B}{'─'*64}")
        print(f"  ANALYSING  {pair}  ({currency})")
        print(f"{'─'*64}{X}\n")

        articles = [] if manual_text else fetch_news(currency, max_articles=20)

        print(f"  {C}[1/5] Sentiment: "
              f"{'text input' if manual_text else f'{len(articles)} articles'}...{X}")
        if manual_text:
            sent_result = self.sentiment.predict(manual_text, currency)
            sent_result["articles_used"] = 0
            if "raw_probs" not in sent_result:
                p = sent_result["probs"]
                sent_result["raw_probs"] = np.array([p["buy"], p["hold"], p["sell"]])
        else:
            sent_result = self.sentiment.predict_articles(articles, currency)

        print(f"  {C}[2/5] Correlation...{X}")
        corr_result = self.correlation.predict(pair)

        print(f"  {C}[3/5] Geopolitical...{X}")
        geo_result = self.geopolitical.predict(pair)

        print(f"  {C}[4/5] Technical (multi-timeframe)...{X}")
        tech_result = self.technical.predict(pair)

        print(f"  {C}[5/5] Macro (LLM news scoring)...{X}")
        macro_result = self.macro.predict(pair)

        # ── decision ──────────────────────────────────────────────────────────
        def _raw(r, keys=("buy", "hold", "sell")):
            return r.get("raw_probs",
                         np.array([r["probs"][k] for k in keys]))

        meta_probs = self.meta.predict(
            _raw(sent_result), _raw(corr_result), _raw(geo_result),
            _raw(tech_result), _raw(macro_result))

        if meta_probs is not None:
            final_probs = meta_probs
            signal      = INT_TO_SIGNAL[int(final_probs.argmax())]
            confidence  = float(final_probs.max())
            reason      = "Meta-model decision (trained stacker)."
        else:
            signal, confidence, reason = rule_based_decision(
                sent_result, corr_result, geo_result, tech_result, macro_result)
            final_probs = np.array([
                1.0 if signal == "buy"  else 0.0,
                1.0 if signal == "hold" else 0.0,
                1.0 if signal == "sell" else 0.0,
            ])

        explanation = ""
        if use_llm:
            explanation = llama_explain(
                pair, signal, confidence,
                sent_result, corr_result, geo_result, tech_result, macro_result,
                reason, self.api_key,
            )

        result = {
            "pair":             pair,
            "timestamp":        datetime.now().isoformat(),
            "final_signal":     signal,
            "final_confidence": confidence,
            "final_probs": {
                "buy":  float(final_probs[0]),
                "hold": float(final_probs[1]),
                "sell": float(final_probs[2]),
            },
            "decision_method": "meta_model" if meta_probs is not None else "rule_based",
            "decision_reason":  reason,
            "explanation":      explanation,
            "agents": {
                "sentiment": {
                    "signal":        sent_result["signal"],
                    "confidence":    sent_result["confidence"],
                    "probs":         sent_result["probs"],
                    "model_votes":   sent_result.get("model_votes", {}),
                    "articles_used": sent_result.get("articles_used", 0),
                },
                "correlation": {
                    "signal":        corr_result["signal"],
                    "confidence":    corr_result["confidence"],
                    "probs":         corr_result["probs"],
                    "sharpe":        corr_result.get("sharpe", 0.0),
                    "last_proba_up": corr_result.get("last_proba_up", 0.5),
                    "last_regime":   corr_result.get("last_regime", 0.5),
                    "score":         corr_result.get("score", 0.5),
                    "available":     corr_result.get("available", False),
                },
                "geopolitical": {
                    "signal":      geo_result["signal"],
                    "confidence":  geo_result["confidence"],
                    "probs":       geo_result["probs"],
                    "model_votes": geo_result.get("model_votes", {}),
                    "agreement":   geo_result.get("agreement", "N/A"),
                    "strength":    geo_result.get("strength",  "N/A"),
                    "close_price": geo_result.get("close_price"),
                    "date":        geo_result.get("date", ""),
                    "available":   geo_result.get("available", False),
                },
                "technical": {
                    "signal":     tech_result["signal"],
                    "confidence": tech_result["confidence"],
                    "probs":      tech_result["probs"],
                    "tf_votes":   tech_result.get("tf_votes", {}),
                    "available":  tech_result.get("available", False),
                },
                "macro": {
                    "signal":      macro_result["signal"],
                    "confidence":  macro_result["confidence"],
                    "probs":       macro_result["probs"],
                    "pair_score":  macro_result.get("pair_score",  0.0),
                    "base_score":  macro_result.get("base_score",  0.0),
                    "quote_score": macro_result.get("quote_score", 0.0),
                    "summary":     macro_result.get("summary",     ""),
                    "drivers":     macro_result.get("drivers",     []),
                    "available":   macro_result.get("available",   False),
                },
            },
        }

        self._print_result(result, articles)
        self._log(result)
        return result

    # ── meta-model training ───────────────────────────────────────────────────
    def train_meta_model(self, history: List[Dict]):
        neutral = {"buy": 1/3, "hold": 1/3, "sell": 1/3}
        prepared = []
        for h in history:
            if "agents" not in h or "true_label" not in h:
                continue
            sp  = h["agents"]["sentiment"]["probs"]
            cp  = h["agents"]["correlation"]["probs"]
            gp  = h["agents"].get("geopolitical", {}).get("probs", neutral)
            tp  = h["agents"].get("technical",    {}).get("probs", neutral)
            mp  = h["agents"].get("macro",         {}).get("probs", neutral)
            prepared.append({
                "sent_probs":  np.array([sp["buy"], sp["hold"], sp["sell"]]),
                "corr_probs":  np.array([cp["buy"], cp["hold"], cp["sell"]]),
                "geo_probs":   np.array([gp["buy"], gp["hold"], gp["sell"]]),
                "tech_probs":  np.array([tp["buy"], tp["hold"], tp["sell"]]),
                "macro_probs": np.array([mp["buy"], mp["hold"], mp["sell"]]),
                "true_label":  h["true_label"],
            })
        self.meta.train(prepared)

    # ── pretty print ──────────────────────────────────────────────────────────
    @staticmethod
    def _print_result(r: Dict, articles: List[Dict]):
        sig  = r["final_signal"]
        conf = r["final_confidence"]
        W    = 64
        col  = {"buy": G, "sell": R, "hold": Y}[sig]
        icon = {"buy": "▲  BUY", "sell": "▼  SELL", "hold": "●  HOLD"}[sig]

        print(f"\n{'═'*W}")
        print(f"  FX-ALPHALAB CENTRAL BRAIN  —  {B}{r['pair']}{X}")
        print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
        print(f"{'═'*W}")
        print(f"\n  SIGNAL      {col}{B}{icon}{X}")
        print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}  ({r['decision_method']})")
        print(f"  REASON      {r['decision_reason']}\n")

        print("  PROBABILITY BREAKDOWN")
        bw = 28
        for label in ["buy", "hold", "sell"]:
            v   = r["final_probs"][label]
            c2  = {"buy": G, "sell": R, "hold": Y}[label]
            bar = f"{'█'*int(v*bw)}{'░'*(bw-int(v*bw))}"
            print(f"  {label.upper():<5s}  {c2}{bar}{X}  {v*100:5.1f}%")

        print(f"\n  AGENT VOTES")
        ag = r["agents"]

        sc = {"buy": G, "sell": R, "hold": Y}[ag["sentiment"]["signal"]]
        print(f"  {'Sentiment':<18s}  {sc}{ag['sentiment']['signal'].upper():<5s}{X}"
              f"  {ag['sentiment']['confidence']*100:.1f}%  "
              f"{C}({ag['sentiment']['articles_used']} articles){X}")

        sc = {"buy": G, "sell": R, "hold": Y}[ag["correlation"]["signal"]]
        print(f"  {'Correlation':<18s}  {sc}{ag['correlation']['signal'].upper():<5s}{X}"
              f"  {ag['correlation']['confidence']*100:.1f}%  "
              f"{C}(Sharpe {ag['correlation']['sharpe']:.2f}){X}")

        geo_ag = ag["geopolitical"]
        if geo_ag["available"]:
            sc = {"buy": G, "sell": R, "hold": Y}[geo_ag["signal"]]
            print(f"  {'Geopolitical':<18s}  {sc}{geo_ag['signal'].upper():<5s}{X}"
                  f"  {geo_ag['confidence']*100:.1f}%  "
                  f"{C}({geo_ag['agreement']} · {geo_ag['strength']}){X}")
        else:
            print(f"  {'Geopolitical':<18s}  {Y}N/A  (data unavailable){X}")

        tech_ag = ag["technical"]
        if tech_ag["available"]:
            sc = {"buy": G, "sell": R, "hold": Y}[tech_ag["signal"]]
            tf_count = len(tech_ag.get("tf_votes", {}))
            print(f"  {'Technical':<18s}  {sc}{tech_ag['signal'].upper():<5s}{X}"
                  f"  {tech_ag['confidence']*100:.1f}%  "
                  f"{C}({tf_count} timeframes){X}")
        else:
            print(f"  {'Technical':<18s}  {Y}N/A  (models unavailable){X}")

        macro_ag = ag["macro"]
        if macro_ag["available"]:
            sc = {"buy": G, "sell": R, "hold": Y}[macro_ag["signal"]]
            print(f"  {'Macro':<18s}  {sc}{macro_ag['signal'].upper():<5s}{X}"
                  f"  {macro_ag['confidence']*100:.1f}%  "
                  f"{C}(score {macro_ag['pair_score']:+.3f}){X}")
        else:
            print(f"  {'Macro':<18s}  {Y}N/A  (API key or script missing){X}")

        # sentiment sub-models
        mv = ag["sentiment"].get("model_votes", {})
        if mv:
            labels = {"lr": "LogReg", "lgb": "LightGBM", "textcnn": "TextCNN",
                      "bilstm": "BiLSTM+Attn", "transformer": "DistilBERT"}
            print(f"\n  SENTIMENT SUB-MODELS")
            for mname, votes in mv.items():
                ms  = max(votes, key=votes.get); mc = votes[ms]
                msc = {"buy": G, "sell": R, "hold": Y}[ms]
                print(f"  {labels.get(mname,mname):<20s}  {msc}{ms.upper():<5s}{X}  {mc*100:.1f}%")

        geo_mv = geo_ag.get("model_votes", {})
        if geo_mv and geo_ag["available"]:
            geo_lbl = {"Model_A":"MLP","Model_B":"GradBoosting","Model_C":"RandomForest"}
            print(f"\n  GEOPOLITICAL SUB-MODELS")
            for mname, votes in geo_mv.items():
                ms  = max(votes, key=votes.get); mc = votes[ms]
                msc = {"buy": G, "sell": R, "hold": Y}[ms]
                print(f"  {geo_lbl.get(mname,mname):<20s}  {msc}{ms.upper():<5s}{X}  {mc*100:.1f}%")

        tf_votes = tech_ag.get("tf_votes", {})
        if tf_votes and tech_ag["available"]:
            print(f"\n  TECHNICAL TIMEFRAMES")
            for tf, v in tf_votes.items():
                best = max(v, key=v.get)
                bsc  = {"buy": G, "sell": R, "hold": Y}[best]
                print(f"  {tf:<5s}  {bsc}{best.upper():<5s}{X}  "
                      f"BUY={v['buy']*100:.1f}%  "
                      f"HOLD={v['hold']*100:.1f}%  "
                      f"SELL={v['sell']*100:.1f}%")

        drivers = macro_ag.get("drivers", [])
        if drivers and macro_ag["available"]:
            print(f"\n  MACRO DRIVERS")
            for d in drivers[:4]:
                print(f"  {C}•{X} {d}")

        if r.get("explanation"):
            import textwrap
            print(f"\n  {B}ANALYSIS{X}")
            for line in textwrap.wrap(r["explanation"], width=W - 4):
                print(f"  {line}")

        if articles:
            print(f"\n  NEWS HEADLINES  ({len(articles)} fetched)")
            for i, a in enumerate(articles[:4], 1):
                t = a["title"][:66] + ("…" if len(a["title"]) > 66 else "")
                print(f"  {C}{i}.{X} {t}")

        print(f"\n  {Y}⚠  NOT FINANCIAL ADVICE.{X}")
        print(f"{'═'*W}\n")

    @staticmethod
    def _log(r: Dict):
        entry = {
            "ts":         r["timestamp"],
            "pair":       r["pair"],
            "signal":     r["final_signal"],
            "confidence": round(r["final_confidence"], 4),
            "method":     r["decision_method"],
            "agents":     {k: v["signal"] for k, v in r["agents"].items()},
        }
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX-AlphaLab Central Brain v6")
    parser.add_argument("--pair",   default="EURUSD", help="e.g. EURUSD, GBPUSD")
    parser.add_argument("--text",   default=None,     help="Manual headline text")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLaMA explanation")
    parser.add_argument("--key",    default=None,     help="TokenFactory API key")
    parser.add_argument("--train",  action="store_true",
                        help="Retrain meta-model from history.json")
    args = parser.parse_args()

    api_key = args.key or LLAMA_API_KEY
    brain   = CentralBrain(llama_api_key=api_key)

    if args.train:
        if not HISTORY_FILE.exists():
            print(f"{R}history.json not found.{X}")
            sys.exit(1)
        history = json.loads(HISTORY_FILE.read_text())
        brain.train_meta_model(history)
        return

    result = brain.predict(
        pair=args.pair,
        manual_text=args.text,
        use_llm=not args.no_llm,
    )

    out = BASE_DIR / "latest_signal.json"
    out.write_text(json.dumps(result, indent=2, default=str))
    print(f"  {C}Result saved → {out}{X}\n")


if __name__ == "__main__":
    main()