"""
FX-ALPHALAB — Correlation Agent
=================================
Loads XGBoost models (one per pair), fetches live daily OHLCV from yfinance,
builds Markov-regime features, and returns a buy/hold/sell signal.

Standalone usage:
    python predict_correlation.py --pair EURUSD
    python predict_correlation.py --pair GBPUSD --no-markov

Used by central_brain.py via:
    from predict_correlation import CorrelationPredictor
"""
from __future__ import annotations

import argparse, json, warnings
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

warnings.filterwarnings("ignore")

# ── colour ────────────────────────────────────────────────────────────────────
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    G=Fore.GREEN; R=Fore.RED; Y=Fore.YELLOW; C=Fore.CYAN; B=Style.BRIGHT; X=Style.RESET_ALL
except ImportError:
    G=R=Y=C=B=X=""

import numpy as np
import pandas as pd
import joblib

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models" / "correlation_agent"
LOG_FILE   = BASE_DIR / "correlation.log"

YF_TICKERS: Dict[str, str] = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "USDCHF": "USDCHF=X",
    "EURJPY": "EURJPY=X",
    "GBPJPY": "GBPJPY=X",
}

SUPPORTED_PAIRS = list(YF_TICKERS.keys())

# ══════════════════════════════════════════════════════════════════════════════
# DATA FETCHER
# ══════════════════════════════════════════════════════════════════════════════
_price_cache: Dict[str, tuple] = {}
CACHE_TTL = 300  # seconds

def fetch_daily(pair: str, bars: int = 600) -> pd.DataFrame:
    """Fetch daily OHLCV from yfinance with a 5-minute cache."""
    cache_key = f"{pair}_D1"
    now = datetime.now()
    if cache_key in _price_cache:
        ts, df = _price_cache[cache_key]
        if (now - ts).seconds < CACHE_TTL:
            return df

    try:
        import yfinance as yf
    except ImportError:
        raise RuntimeError("Run: pip install yfinance")

    ticker = YF_TICKERS.get(pair.upper(), f"{pair}=X")
    df = yf.download(ticker, interval="1d", period=f"{bars}d",
                     auto_adjust=True, progress=False)
    if df.empty:
        raise ValueError(f"No daily data returned for {pair}")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df[["Open","High","Low","Close","Volume"]].dropna().tail(bars)
    _price_cache[cache_key] = (now, df)
    return df

# ══════════════════════════════════════════════════════════════════════════════
# FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════════════════════
def build_features(df: pd.DataFrame, use_markov: bool = True) -> pd.DataFrame:
    """
    Builds the exact feature set used during correlation-agent training:
        lag1, lag2, vol (10-day rolling std), ma (5-day rolling mean), regime.

    regime: Markov-switching probability of high-volatility state (state 1).
            Falls back to a rolling-vol proxy if statsmodels is unavailable
            or if use_markov=False.
    """
    if "close" in df.columns and "Close" not in df.columns:
        df = df.rename(columns={"close": "Close"})

    r = np.log(df["Close"] / df["Close"].shift(1)).dropna()

    # ── regime ───────────────────────────────────────────────────────────────
    regime = None
    if use_markov:
        try:
            from statsmodels.tsa.regime_switching.markov_regression import MarkovRegression
            mod = MarkovRegression(r, k_regimes=2, trend="c", switching_variance=True)
            res = mod.fit(disp=False)
            regime = res.smoothed_marginal_probabilities[1]
        except Exception:
            regime = None

    if regime is None:
        regime = r.rolling(20).std() / (r.rolling(60).std() + 1e-9)
        regime = regime.clip(0, 1).fillna(0.5)

    X = pd.DataFrame(index=r.index)
    X["lag1"]   = r.shift(1)
    X["lag2"]   = r.shift(2)
    X["vol"]    = r.rolling(10).std()
    X["ma"]     = r.rolling(5).mean()
    X["regime"] = regime.reindex(r.index).fillna(0.5)
    return X.dropna()

# ══════════════════════════════════════════════════════════════════════════════
# CORRELATION PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════
class CorrelationPredictor:
    """
    Loads one XGBoost model per pair from models/correlation_agent/xgb_corr_PAIR.pkl.

    predict(pair) → {
        "signal":        "buy" | "hold" | "sell",
        "confidence":    float,
        "probs":         {"buy": float, "hold": float, "sell": float},
        "raw_probs":     np.ndarray,   # shape (3,) — for meta-model
        "sharpe":        float,
        "last_proba_up": float,
        "last_regime":   float,
        "score":         float,
        "available":     bool,
    }
    """

    def __init__(self, models_dir: Path = MODELS_DIR):
        self.dir    = Path(models_dir)
        self.models: Dict[str, object] = {}
        self._load()

    # ── loader ────────────────────────────────────────────────────────────────
    def _load(self):
        pkl_files = list(self.dir.glob("xgb_corr_*.pkl"))
        if not pkl_files:
            raise FileNotFoundError(
                f"No xgb_corr_*.pkl files found in {self.dir}\n"
                f"Run the correlation training notebook first."
            )
        for f in pkl_files:
            pair   = f.stem.replace("xgb_corr_", "").upper()
            loaded = joblib.load(f)

            # ── unwrap dict if the notebook saved {model: ..., ...} ──────────
            if isinstance(loaded, dict):
                print(f"  {Y}  [corr] {f.name} is a dict — unwrapping.{X}")
                model = (loaded.get("model") or
                         loaded.get("xgb_model") or
                         loaded.get("estimator") or
                         next(iter(loaded.values())))
            else:
                model = loaded

            self.models[pair] = model
            print(f"  {G}  Corr model loaded: {pair}{X}")

    # ── static helpers ────────────────────────────────────────────────────────
    @staticmethod
    def _sharpe(pnl: np.ndarray) -> float:
        return float(np.mean(pnl) / (np.std(pnl) + 1e-9) * np.sqrt(252))

    @staticmethod
    def _neutral() -> Dict:
        return {
            "signal":"hold","confidence":0.333,
            "probs":{"buy":0.333,"hold":0.334,"sell":0.333},
            "raw_probs":np.array([0.333,0.334,0.333]),
            "sharpe":0.0,"last_proba_up":0.5,"last_regime":0.5,
            "score":0.5,"available":False,
        }

    # ── main inference ────────────────────────────────────────────────────────
    def predict(self, pair: str, use_markov: bool = True) -> Dict:
        pair_clean = pair.replace("/","").replace("-","").upper()

        if pair_clean not in self.models:
            print(f"  {Y}  No correlation model for {pair_clean} — returning neutral.{X}")
            return self._neutral()

        model = self.models[pair_clean]

        print(f"  {C}Correlation: fetching live daily data for {pair_clean}...{X}")
        try:
            df = fetch_daily(pair_clean, bars=600)
        except Exception as ex:
            print(f"  {R}  Data fetch failed: {ex}{X}")
            return self._neutral()

        X_feat = build_features(df, use_markov=use_markov)
        if X_feat.empty or len(X_feat) < 10:
            print(f"  {Y}  Not enough feature rows for {pair_clean}.{X}")
            return self._neutral()

        # ── XGBoost inference ─────────────────────────────────────────────────
        proba_up = model.predict_proba(X_feat)[:, 1]

        returns     = np.log(df["Close"] / df["Close"].shift(1)).dropna()
        regime_vals = X_feat["regime"].values
        signal_arr  = np.where(
            (proba_up > 0.55) & (regime_vals > 0.5),  1,
            np.where((proba_up < 0.45) & (regime_vals > 0.5), -1, 0),
        )
        pnl        = signal_arr * returns.reindex(X_feat.index).values
        sharpe_val = self._sharpe(pnl)

        last_proba  = float(proba_up[-1])
        last_regime = float(regime_vals[-1])

        accuracy    = float(np.mean(
            (proba_up > 0.5).astype(int) ==
            (returns.reindex(X_feat.index).values > 0).astype(int)
        ))
        mc_sims     = [np.sum(np.random.choice(pnl, size=len(pnl), replace=True))
                       for _ in range(300)]
        prob_profit = float(np.mean(np.array(mc_sims) > 0))

        # ── composite score (mirrors training notebook) ───────────────────────
        score = (0.30 * last_proba +
                 0.25 * min(sharpe_val / 2, 1.0) +
                 0.25 * accuracy +
                 0.20 * prob_profit)

        if score > 0.60 and last_regime > 0.5:
            sig  = "buy";  conf = round(float(score), 3)
        elif score < 0.40 and last_regime > 0.5:
            sig  = "sell"; conf = round(float(1.0 - score), 3)
        else:
            sig  = "hold"; conf = round(float(0.3 + abs(score - 0.5) * 0.4), 3)

        # ── soft 3-class probability vector [buy, hold, sell] ─────────────────
        buy_p  = float(np.clip(last_proba,       0, 1))
        sell_p = float(np.clip(1 - last_proba,   0, 1))
        hold_p = max(0.0, 1 - abs(last_proba - 0.5) * 2)
        total  = buy_p + sell_p + hold_p
        raw    = np.array([buy_p / total, hold_p / total, sell_p / total])

        print(f"  {C}Correlation ({pair_clean}): {sig.upper()} "
              f"conf={conf:.3f}  sharpe={sharpe_val:.2f}  "
              f"score={score:.3f}  regime={last_regime:.2f}{X}")

        return {
            "signal":        sig,
            "confidence":    conf,
            "probs":         {"buy": float(raw[0]), "hold": float(raw[1]), "sell": float(raw[2])},
            "raw_probs":     raw,
            "sharpe":        sharpe_val,
            "last_proba_up": last_proba,
            "last_regime":   last_regime,
            "score":         score,
            "available":     True,
        }

# ══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════════════════════
def log_prediction(pair: str, result: Dict):
    entry = {
        "ts":         datetime.now().isoformat(),
        "pair":       pair,
        "signal":     result["signal"],
        "confidence": round(result["confidence"], 4),
        "sharpe":     round(result.get("sharpe", 0.0), 4),
        "score":      round(result.get("score",  0.0), 4),
        "regime":     round(result.get("last_regime", 0.5), 4),
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

# ══════════════════════════════════════════════════════════════════════════════
# PRETTY PRINT
# ══════════════════════════════════════════════════════════════════════════════
def print_result(pair: str, result: Dict):
    sig  = result["signal"]
    conf = result["confidence"]
    col  = {"buy":G,"sell":R,"hold":Y}[sig]
    icon = {"buy":"▲  BUY","sell":"▼  SELL","hold":"●  HOLD"}[sig]
    W    = 64

    print("\n" + "═"*W)
    print(f"  FX CORRELATION SIGNAL  —  {B}{pair}{X}")
    print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print("═"*W)
    print(f"\n  SIGNAL      {col}{B}{icon}{X}")
    print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}\n")

    print("  PROBABILITY BREAKDOWN")
    bw = 28
    for lbl, val in [("buy",   result["probs"]["buy"]),
                     ("hold",  result["probs"]["hold"]),
                     ("sell",  result["probs"]["sell"])]:
        c2  = {"buy":G,"sell":R,"hold":Y}[lbl]
        bar = f"{'█'*int(val*bw)}{'░'*(bw-int(val*bw))}"
        print(f"  {lbl.upper():<5s}  {c2}{bar}{X}  {val*100:5.1f}%")

    print(f"\n  DETAILS")
    print(f"  Composite score : {result.get('score',0):.3f}")
    print(f"  Sharpe ratio    : {result.get('sharpe',0):.2f}")
    print(f"  Last P(up)      : {result.get('last_proba_up',0.5)*100:.1f}%")
    print(f"  Last regime     : {result.get('last_regime',0.5):.2f}  "
          f"({'high vol' if result.get('last_regime',0) > 0.5 else 'low vol'})")

    print(f"\n  {Y}⚠  NOT FINANCIAL ADVICE. Educational use only.{X}")
    print("═"*W + "\n")

# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX Correlation Agent")
    parser.add_argument("--pair",      default="EURUSD",
                        help=f"One of: {', '.join(SUPPORTED_PAIRS)}")
    parser.add_argument("--no-markov", action="store_true",
                        help="Skip Markov-regime fit (faster, uses vol proxy)")
    args = parser.parse_args()

    pair = args.pair.upper().replace("/","").replace("-","")
    predictor = CorrelationPredictor()
    result = predictor.predict(pair, use_markov=not args.no_markov)
    print_result(pair, result)
    log_prediction(pair, result)
    print(f"  {C}Logged to {LOG_FILE}{X}\n")

if __name__ == "__main__":
    main()
