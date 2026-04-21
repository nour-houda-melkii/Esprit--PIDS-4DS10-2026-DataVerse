"""
FX-ALPHALAB — Technical Agent
==============================
Loads multi-timeframe ensemble models (RandomForest + HistGradientBoosting + LogReg)
trained per pair × timeframe, fetches recent OHLCV data via yfinance,
engineers technical features, and returns a buy / hold / sell signal.

Standalone usage:
    python predict_technical.py --pair EURUSD
    python predict_technical.py --pair EURUSD --no-api   (cached CSV only)

Used by central_brain.py via:
    from predict_technical import TechnicalPredictor
"""
from __future__ import annotations

import argparse, json, sys, warnings
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
import pandas as pd
import joblib


# ══════════════════════════════════════════════════════════════════════════════
# SKLEARN VERSION COMPATIBILITY PATCH
# Models saved with sklearn <1.3 have SimpleImputer without _fill_dtype.
# This patch adds the missing attribute so joblib.load() works on newer sklearn.
# ══════════════════════════════════════════════════════════════════════════════
def _patch_sklearn_imputer(obj):
    """
    Recursively walk any sklearn estimator/pipeline and add the missing
    _fill_dtype attribute to any SimpleImputer that was saved without it.
    Call this immediately after joblib.load().
    """
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.utils.validation import check_is_fitted

    if isinstance(obj, SimpleImputer):
        if not hasattr(obj, '_fill_dtype'):
            import numpy as _np
            # Default dtype used by older sklearn: float64
            obj._fill_dtype = _np.float64
        if not hasattr(obj, 'feature_names_in_'):
            pass   # fine — not always present
    if isinstance(obj, Pipeline):
        for _, step in obj.steps:
            _patch_sklearn_imputer(step)
    # Handle nested estimators (e.g. inside EnsembleModel.models dict)
    if hasattr(obj, 'models') and isinstance(getattr(obj, 'models'), dict):
        for m in obj.models.values():
            _patch_sklearn_imputer(m)
    if hasattr(obj, 'estimators_') and obj.estimators_:
        for e in obj.estimators_:
            _patch_sklearn_imputer(e)
    return obj

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models" / "technical_agent"
DATA_DIR   = BASE_DIR / "clean_multi_tf"
LOG_FILE   = BASE_DIR / "technical.log"

TIMEFRAMES: Tuple[str, ...] = ("H1", "H4", "D1", "W1")

# Pair → yfinance ticker symbol
YF_TICKERS: Dict[str, str] = {
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "USDCHF": "USDCHF=X",
    "EURJPY": "EURJPY=X",
    "GBPJPY": "GBPJPY=X",
}

# Timeframe → (yfinance interval, download period)
# H4 is resampled from H1 data
YF_SETTINGS: Dict[str, Tuple[str, str]] = {
    "H1": ("1h",  "60d"),
    "H4": ("1h",  "60d"),
    "D1": ("1d",  "2y"),
    "W1": ("1wk", "10y"),
}

# ══════════════════════════════════════════════════════════════════════════════
# MODEL CLASS — must exactly match the class pickled in the notebook
# ══════════════════════════════════════════════════════════════════════════════
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class EnsembleModel:
    """
    RF + HGB + LR ensemble — exact replica of the class from the Tech-Agent
    notebook so that joblib.load() can deserialise the saved .pkl files.
    Signal mapping:  0 = SELL,  1 = HOLD,  2 = BUY
    """
    def __init__(self):
        self.models:   Dict = {}
        self.features: List[str] = []

    def predict_proba(self, df: pd.DataFrame) -> Dict[str, float]:
        X = df[self.features].iloc[[-1]]
        all_probs = []
        for model in self.models.values():
            p = model.predict_proba(X)[0]
            if len(p) == 2:                          # binary edge-case guard
                p = np.array([p[0], 0.0, p[1]])
            all_probs.append(p)
        avg = np.mean(all_probs, axis=0)
        # indices: 0→SELL, 1→HOLD, 2→BUY
        return {"SELL": float(avg[0]), "HOLD": float(avg[1]), "BUY": float(avg[2])}


# ══════════════════════════════════════════════════════════════════════════════
# DATA PROCESSOR — same feature engineering pipeline as the notebook
# ══════════════════════════════════════════════════════════════════════════════
class DataProcessor:

    @staticmethod
    def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
        d = df.copy()
        c = d["close"]

        # Returns
        d["ret1"]  = c.pct_change()
        d["ret5"]  = c.pct_change(5)
        d["ret20"] = c.pct_change(20)

        # Moving averages
        d["sma_20"]   = c.rolling(20).mean()
        d["ema_21"]   = c.ewm(span=21).mean()
        d["dist_ema"] = (c - d["ema_21"]) / c

        # Volatility
        d["volatility"] = d["ret1"].rolling(20).std()

        # RSI (14)
        delta = c.diff()
        gain  = delta.clip(lower=0)
        loss  = -delta.clip(upper=0)
        avg_g = gain.ewm(alpha=1/14).mean()
        avg_l = loss.ewm(alpha=1/14).mean()
        rs    = avg_g / (avg_l + 1e-12)
        d["rsi"] = 100 - (100 / (1 + rs))

        # ATR (14)
        hl = d["high"] - d["low"]
        hc = (d["high"] - d["close"].shift()).abs()
        lc = (d["low"]  - d["close"].shift()).abs()
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        d["atr"] = tr.rolling(14).mean()

        # Price position (20-bar channel)
        lo20  = d["low"].rolling(20).min()
        hi20  = d["high"].rolling(20).max()
        d["price_position"] = (c - lo20) / (hi20 - lo20 + 1e-12)

        # Volume ratio (if data has volume)
        if "volume" in d.columns:
            vol_ma = d["volume"].rolling(20).mean()
            d["volume_ratio"] = d["volume"] / (vol_ma + 1e-12)

        return d.replace([np.inf, -np.inf], np.nan)

    @staticmethod
    def get_feature_columns(df: pd.DataFrame) -> List[str]:
        exclude = ["target", "future_return", "timestamp",
                   "pair", "timeframe", "source"]
        return [c for c in df.select_dtypes(include=[np.number]).columns
                if c not in exclude]


# ══════════════════════════════════════════════════════════════════════════════
# LIVE DATA FETCHING
# ══════════════════════════════════════════════════════════════════════════════
def _fetch_yfinance(pair: str, tf: str) -> Optional[pd.DataFrame]:
    """Download OHLCV from yfinance and normalise column names."""
    try:
        import yfinance as yf
    except ImportError:
        print(f"{Y}Install yfinance:  pip install yfinance{X}")
        return None

    ticker = YF_TICKERS.get(pair)
    if ticker is None:
        return None

    interval, period = YF_SETTINGS.get(tf, ("1d", "2y"))

    try:
        raw = yf.download(ticker, interval=interval, period=period,
                          progress=False, auto_adjust=True)
        if raw is None or len(raw) == 0:
            return None

        # Flatten multi-level columns produced by newer yfinance versions
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)

        raw.columns = [c.lower().replace(" ", "_") for c in raw.columns]
        raw = raw.rename(columns={"adj_close": "close"})

        for col in ("open", "high", "low", "close"):
            if col not in raw.columns:
                return None

        # Reset index so that datetime becomes a plain column
        raw = raw.reset_index()
        date_col = [c for c in raw.columns if c.lower() in ("date", "datetime", "index")]
        if date_col:
            raw = raw.rename(columns={date_col[0]: "timestamp"})

        if "volume" not in raw.columns:
            raw["volume"] = 0

        # H4 = resample hourly data to 4-hourly bars
        if tf == "H4":
            raw = (raw.set_index("timestamp")
                      .resample("4h")
                      .agg({"open": "first", "high": "max",
                            "low": "min",   "close": "last",
                            "volume": "sum"})
                      .dropna()
                      .reset_index())

        raw["pair"]      = pair
        raw["timeframe"] = tf
        keep = ["timestamp", "open", "high", "low", "close",
                "volume", "pair", "timeframe"]
        return raw[[c for c in keep if c in raw.columns]].dropna(subset=["close"])

    except Exception as e:
        print(f"{Y}  yfinance error [{pair} {tf}]: {e}{X}")
        return None


def _load_csv_fallback(pair: str, tf: str) -> Optional[pd.DataFrame]:
    """Load the last 250 rows from the pre-cached clean CSV."""
    path = DATA_DIR / f"{pair}_{tf}_clean.csv"
    if not path.exists():
        return None
    try:
        df = pd.read_csv(path, parse_dates=["timestamp"])
        return df.tail(250).reset_index(drop=True)
    except Exception as e:
        print(f"{Y}  CSV fallback failed [{pair} {tf}]: {e}{X}")
        return None


def get_data(pair: str, tf: str, use_api: bool = True) -> Optional[pd.DataFrame]:
    """Try yfinance first; fall back to cached CSV if it fails or is too short."""
    df = None
    if use_api:
        df = _fetch_yfinance(pair, tf)
    if df is None or len(df) < 50:
        df = _load_csv_fallback(pair, tf)
    return df


# ══════════════════════════════════════════════════════════════════════════════
# TECHNICAL PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════
class TechnicalPredictor:
    """
    Loads one EnsembleModel pkl per (pair, timeframe) from
    models/technical_agent/{PAIR}_{TF}.pkl, fetches live data, and
    returns a cross-timeframe aggregated signal.

    predict(pair) → {
        "signal":     "buy" | "hold" | "sell",
        "confidence": float,
        "probs":      {"buy": f, "hold": f, "sell": f},
        "raw_probs":  np.ndarray shape (3,),  # order: [buy, hold, sell]
        "tf_votes":   {tf: {"buy": f, "hold": f, "sell": f}},
        "available":  bool,
    }
    """

    def __init__(self, models_dir: Path = MODELS_DIR):
        self.dir       = Path(models_dir)
        self.processor = DataProcessor()
        self.models:   Dict[Tuple[str, str], EnsembleModel] = {}
        print(f"  {C}Loading Technical models from {self.dir.name}/...{X}")
        self._load_all()

    # ── loader ────────────────────────────────────────────────────────────────
    def _load_all(self):
        if not self.dir.exists():
            print(f"  {R}✗ Technical models dir not found: {self.dir}{X}")
            return

        loaded = 0
        for pkl in sorted(self.dir.glob("*.pkl")):
            # Expected filenames: EURUSD_H1.pkl, GBPUSD_D1.pkl …
            parts = pkl.stem.rsplit("_", 1)
            if len(parts) != 2:
                continue
            pair_name, tf = parts
            if tf not in TIMEFRAMES:
                continue
            try:
                loaded_model = joblib.load(pkl)
                _patch_sklearn_imputer(loaded_model)
                self.models[(pair_name, tf)] = loaded_model
                loaded += 1
            except Exception as e:
                print(f"  {Y}  ⚠ Could not load {pkl.name}: {e}{X}")

        if loaded == 0:
            print(f"  {R}  No technical models found in {self.dir}{X}")
        else:
            print(f"  {G}  ✓ {loaded} model(s) loaded{X}")

    # ── helpers ───────────────────────────────────────────────────────────────
    def _unavailable(self, reason: str = "") -> Dict:
        neutral = np.array([1/3, 1/3, 1/3])
        return {
            "signal":     "hold",
            "confidence": 1/3,
            "probs":      {"buy": 1/3, "hold": 1/3, "sell": 1/3},
            "raw_probs":  neutral,
            "tf_votes":   {},
            "available":  False,
            "reason":     reason,
        }

    # ── main inference ────────────────────────────────────────────────────────
    def predict(self, pair: str, use_api: bool = True) -> Dict:
        """Run all available timeframe models for the given pair."""
        pair = pair.upper().replace("/", "").replace("-", "")

        tf_probs:  Dict[str, Dict[str, float]] = {}
        buy_list, hold_list, sell_list = [], [], []

        for tf in TIMEFRAMES:
            model = self.models.get((pair, tf))
            if model is None:
                continue                            # no model for this tf → skip

            df_raw = get_data(pair, tf, use_api=use_api)
            if df_raw is None or len(df_raw) < 50:
                continue

            df_feat = self.processor.engineer_features(df_raw)

            # Add any missing feature columns the model expects (as NaN)
            for col in model.features:
                if col not in df_feat.columns:
                    df_feat[col] = np.nan

            try:
                probs = model.predict_proba(df_feat)
            except Exception as e:
                print(f"  {Y}  Prediction error [{pair} {tf}]: {e}{X}")
                continue

            tf_probs[tf] = {
                "buy":  probs["BUY"],
                "hold": probs["HOLD"],
                "sell": probs["SELL"],
            }
            buy_list.append(probs["BUY"])
            hold_list.append(probs["HOLD"])
            sell_list.append(probs["SELL"])

        if not tf_probs:
            return self._unavailable(f"No predictions available for {pair}")

        avg_buy  = float(np.mean(buy_list))
        avg_hold = float(np.mean(hold_list))
        avg_sell = float(np.mean(sell_list))

        # Normalise to sum=1
        total = avg_buy + avg_hold + avg_sell
        if total > 1e-9:
            avg_buy  /= total
            avg_hold /= total
            avg_sell /= total

        if avg_buy > avg_sell and avg_buy > avg_hold:
            signal, confidence = "buy",  avg_buy
        elif avg_sell > avg_buy and avg_sell > avg_hold:
            signal, confidence = "sell", avg_sell
        else:
            signal, confidence = "hold", avg_hold

        return {
            "signal":     signal,
            "confidence": float(confidence),
            "probs":      {"buy": avg_buy, "hold": avg_hold, "sell": avg_sell},
            "raw_probs":  np.array([avg_buy, avg_hold, avg_sell]),
            "tf_votes":   tf_probs,
            "available":  True,
        }


# ══════════════════════════════════════════════════════════════════════════════
# PRETTY PRINT
# ══════════════════════════════════════════════════════════════════════════════
def _bar(label: str, value: float, width: int = 28) -> str:
    col = {"buy": G, "sell": R, "hold": Y}.get(label, X)
    return (f"  {label.upper():<5s}  "
            f"{col}{'█'*int(value*width)}{'░'*(width-int(value*width))}{X}"
            f"  {value*100:5.1f}%")


def print_result(pair: str, result: Dict):
    sig  = result["signal"]
    conf = result["confidence"]
    prob = result["probs"]
    col  = {"buy": G, "sell": R, "hold": Y}[sig]
    icon = {"buy": "▲  BUY", "sell": "▼  SELL", "hold": "●  HOLD"}[sig]
    W    = 64

    print("\n" + "═"*W)
    print(f"  TECHNICAL SIGNAL  —  {B}{pair}{X}")
    print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print("═"*W)
    print(f"\n  SIGNAL      {col}{B}{icon}{X}")
    print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}\n")
    print("  PROBABILITY BREAKDOWN")
    for lbl in ["buy", "hold", "sell"]:
        print(_bar(lbl, prob[lbl]))

    tf_votes = result.get("tf_votes", {})
    if tf_votes:
        print(f"\n  TIMEFRAME BREAKDOWN  ({len(tf_votes)} active)")
        for tf, v in tf_votes.items():
            best = max(v, key=v.get)
            bc   = {"buy": G, "sell": R, "hold": Y}[best]
            print(f"  {tf:<5s}  {bc}{best.upper():<5s}{X}  "
                  f"{C}BUY={v['buy']*100:.1f}%  "
                  f"HOLD={v['hold']*100:.1f}%  "
                  f"SELL={v['sell']*100:.1f}%{X}")

    if not result["available"]:
        print(f"\n  {R}UNAVAILABLE: {result.get('reason','')}{X}")

    print()
    print(f"  {Y}⚠  NOT FINANCIAL ADVICE. Educational use only.{X}")
    print("═"*W + "\n")


def log_prediction(pair: str, result: Dict):
    entry = {
        "ts":         datetime.now().isoformat(),
        "pair":       pair,
        "signal":     result["signal"],
        "confidence": round(result["confidence"], 4),
        "buy":        round(result["probs"]["buy"],  4),
        "hold":       round(result["probs"]["hold"], 4),
        "sell":       round(result["probs"]["sell"], 4),
        "available":  result["available"],
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX Technical Agent")
    parser.add_argument("--pair",   default="EURUSD",
                        help="Currency pair, e.g. EURUSD, GBPUSD")
    parser.add_argument("--no-api", action="store_true",
                        help="Skip yfinance — use cached CSV only")
    args = parser.parse_args()

    pair = args.pair.upper().replace("-", "").replace("/", "")
    if pair not in YF_TICKERS:
        print(f"{R}Unknown pair '{pair}'. Supported: {list(YF_TICKERS.keys())}{X}")
        sys.exit(1)

    predictor = TechnicalPredictor()
    result    = predictor.predict(pair, use_api=not args.no_api)
    print_result(pair, result)
    log_prediction(pair, result)
    print(f"  {C}Logged to {LOG_FILE}{X}\n")


if __name__ == "__main__":
    main()