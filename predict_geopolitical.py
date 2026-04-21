"""
FX-ALPHALAB — Geopolitical Agent
==================================
Loads 3 pre-trained models per pair (Model_A/B/C_{PAIR}.keras),
extracts the latest features from the processed geopolitical dataset,
and returns a buy/hold/sell signal using a weighted coordinator vote.

Model roster per pair:
    Model_A  — MLP (Neural Network)
    Model_B  — Gradient Boosting
    Model_C  — Random Forest

Feature set (24 columns):
    Price technicals  : log_return, pct_return, rsi_14, macd, macd_signal,
                        macd_hist, bb_position, bb_width,
                        realized_vol_5d, realized_vol_20d, atr_14,
                        sma_5, sma_20, ema_5, ema_20,
                        return_lag_1, return_lag_3, return_lag_5
    Geopolitical/NLP  : sentiment_mean, vader_compound, textblob_polarity,
                        gdelt_tone, gdelt_geo_intensity, n_articles

Data source  : data/processed/fx_geopolitical_features.csv
Models dir   : models/geopolitical_agent/
Scalers dir  : models/geopolitical_agent/   (scaler_{PAIR}.pkl)

Notebook labels: BUY=0 · SELL=1 · HOLD=2
Central Brain  : buy=0 · hold=1 · sell=2  ← converted internally

Standalone usage:
    python predict_geopolitical.py --pair EURUSD
    python predict_geopolitical.py --pair GBPUSD --data path/to/features.csv
    python predict_geopolitical.py --all

Used by central_brain.py via:
    from predict_geopolitical import GeopoliticalPredictor
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
import joblib

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models" / "geopolitical_agent"
DATA_PATH  = BASE_DIR / "data" / "processed" / "fx_geopolitical_features.csv"
LOG_FILE   = BASE_DIR / "geopolitical.log"

FX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF"]

# Notebook label encoding:  BUY→0  SELL→1  HOLD→2
# Central brain encoding:   buy→0  hold→1  sell→2
# The index remap: [nb_idx0, nb_idx1, nb_idx2] → [buy, hold, sell]
NB_IDX_TO_CB = [0, 2, 1]   # NB: [P(BUY), P(SELL), P(HOLD)] → CB: [buy, hold, sell]

NB_LABEL_REV: Dict[int,str] = {0:"buy", 1:"sell", 2:"hold"}

FEATURE_COLS: List[str] = [
    "log_return", "pct_return", "rsi_14", "macd", "macd_signal", "macd_hist",
    "bb_position", "bb_width", "realized_vol_5d", "realized_vol_20d",
    "atr_14", "sma_5", "sma_20", "ema_5", "ema_20",
    "return_lag_1", "return_lag_3", "return_lag_5",
    "sentiment_mean", "vader_compound", "textblob_polarity",
    "gdelt_tone", "gdelt_geo_intensity", "n_articles",
]

MODEL_NAMES  = ["Model_A", "Model_B", "Model_C"]
MODEL_LABELS = {"Model_A": "MLP",
                "Model_B": "GradientBoosting",
                "Model_C": "RandomForest"}

SEQ_LEN = 20   # minimum rows required before last row

# ══════════════════════════════════════════════════════════════════════════════
# MODEL LOADER  (Keras .keras  OR  sklearn joblib — auto-detected)
# ══════════════════════════════════════════════════════════════════════════════
def _load_model(path: Path):
    """
    Try TF/Keras first (native .keras format), fall back to joblib.
    Returns (model, backend) where backend ∈ {"keras", "sklearn"}.
    """
    # ── Keras ──
    try:
        import tensorflow as tf          # noqa: F401  (optional dep)
        model = tf.keras.models.load_model(str(path))
        return model, "keras"
    except Exception:
        pass

    # ── joblib fallback (sklearn models saved with .keras extension) ──
    try:
        model = joblib.load(str(path))
        return model, "sklearn"
    except Exception as e:
        raise RuntimeError(f"Cannot load model at {path}: {e}") from e


def _predict_proba(model, backend: str, X: np.ndarray) -> np.ndarray:
    """
    Return probability array of shape (3,) regardless of backend.
    Notebook label order: [P(BUY), P(SELL), P(HOLD)]
    """
    x = X.reshape(1, -1)
    if backend == "keras":
        probs = model.predict(x, verbose=0)[0]
    else:
        probs = model.predict_proba(x)[0]
    return probs.astype(float)


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════
def _get_latest_row(df, pair: str, window: int = SEQ_LEN + 100
                    ) -> Tuple[Optional[np.ndarray], List[str], Optional[float], str]:
    """
    Filter the DataFrame for `pair`, take the last `window` rows,
    drop NaNs on available feature columns, and return:
        (feature_vector, used_feature_cols, close_price, date_str)
    Returns (None, [], None, "") when not enough data.
    """
    import pandas as pd

    sub = df[df["pair"] == pair].sort_values("date").reset_index(drop=True)
    sub = sub.tail(window).copy()

    avail = [c for c in FEATURE_COLS if c in sub.columns]
    if not avail:
        return None, [], None, ""

    sub = sub.dropna(subset=avail)
    if len(sub) < SEQ_LEN:
        return None, [], None, ""

    row   = sub[avail].values[-1].astype(np.float32)
    close = float(sub["close"].iloc[-1]) if "close" in sub.columns else None
    date  = str(sub["date"].iloc[-1])[:10] if "date" in sub.columns else ""
    return row, avail, close, date


# ══════════════════════════════════════════════════════════════════════════════
# GEOPOLITICAL PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════
class GeopoliticalPredictor:
    """
    Loads pre-trained Model_A/B/C for each supported pair and wraps
    them in the same interface expected by central_brain.py:

        predict(pair) → {
            "signal":       "buy" | "hold" | "sell",
            "confidence":   float,
            "probs":        {"buy": float, "hold": float, "sell": float},
            "raw_probs":    np.ndarray shape (3,)  [buy, hold, sell],
            "model_votes":  {model_name: {"buy": f, "hold": f, "sell": f}},
            "agreement":    "UNANIMOUS" | "MAJORITY" | "SPLIT",
            "strength":     "HIGH" | "MEDIUM" | "LOW",
            "pair":         str,
            "close_price":  float | None,
            "date":         str,
            "available":    bool,
        }
    """

    # ------------------------------------------------------------------
    def __init__(self, models_dir: Path = MODELS_DIR,
                 data_path: Path = DATA_PATH):
        self.dir       = Path(models_dir)
        self.data_path = Path(data_path)
        self._models:  Dict[str, Dict[str, tuple]] = {}   # pair → {name: (model, backend)}
        self._scalers: Dict[str, object]            = {}   # pair → sklearn scaler or None
        self._feat_cols: Dict[str, List[str]]       = {}   # pair → feature col list
        self._df = None                                     # lazy-loaded DataFrame

        print(f"\n{B}Loading Geopolitical Agent...{X}")
        self._load_all()

    # ── helpers ──────────────────────────────────────────────────────────────
    def _load_all(self):
        found_any = False
        for pair in FX_PAIRS:
            trio = {}
            for mname in MODEL_NAMES:
                path = self.dir / f"{mname}_{pair}.keras"
                if not path.exists():
                    continue
                try:
                    model, backend = _load_model(path)
                    trio[mname] = (model, backend)
                    print(f"  {G}✓{X} {mname}_{pair}  [{backend}]")
                except Exception as ex:
                    print(f"  {Y}✗ {mname}_{pair}: {ex}{X}")

            if trio:
                self._models[pair] = trio
                found_any = True

                # Try to load a pre-fitted scaler for this pair
                for ext in [".pkl", ".joblib"]:
                    sp = self.dir / f"scaler_{pair}{ext}"
                    if sp.exists():
                        try:
                            self._scalers[pair] = joblib.load(sp)
                            print(f"  {G}✓{X} scaler_{pair}")
                        except Exception:
                            pass
                        break

        if not found_any:
            print(f"  {Y}⚠  No geopolitical models found in {self.dir}{X}")
            print(f"  {Y}   Expected: models/geopolitical_agent/Model_A_EURUSD.keras etc.{X}")
        else:
            n = sum(len(v) for v in self._models.values())
            print(f"  {G}{B}Geopolitical agent ready — {n} models across {len(self._models)} pairs.{X}")

    def _load_df(self):
        """Lazy-load the processed geopolitical CSV once."""
        if self._df is not None:
            return True
        if not self.data_path.exists():
            print(f"  {Y}Geo data not found: {self.data_path}{X}")
            return False
        try:
            import pandas as pd
            self._df = pd.read_csv(self.data_path, parse_dates=["date"])
            return True
        except Exception as ex:
            print(f"  {Y}Failed to load geo data: {ex}{X}")
            return False

    # ── main predict ─────────────────────────────────────────────────────────
    def predict(self, pair: str) -> Dict:
        """
        Predict buy/hold/sell for `pair` using the latest available data.
        Always returns a valid dict; sets `available=False` on failure.
        """
        pair = pair.upper().replace("/", "").replace("-", "")

        UNAVAILABLE = {
            "signal": "hold", "confidence": 0.333,
            "probs": {"buy": 0.333, "hold": 0.334, "sell": 0.333},
            "raw_probs": np.array([0.333, 0.334, 0.333]),
            "model_votes": {}, "agreement": "N/A", "strength": "N/A",
            "pair": pair, "close_price": None, "date": "", "available": False,
        }

        if pair not in self._models:
            return {**UNAVAILABLE, "error": f"No models for {pair}"}

        if not self._load_df():
            return {**UNAVAILABLE, "error": "Processed data unavailable"}

        raw_row, feat_cols, close, date = _get_latest_row(self._df, pair)
        if raw_row is None:
            return {**UNAVAILABLE, "error": f"Insufficient rows for {pair}"}

        # ── scale ─────────────────────────────────────────────────────────
        if pair in self._scalers:
            try:
                x_scaled = self._scalers[pair].transform(raw_row.reshape(1, -1))[0]
            except Exception:
                x_scaled = raw_row
        else:
            # Fallback: z-score normalise using the last 200 rows on-the-fly
            sub = self._df[self._df["pair"] == pair].sort_values("date").tail(200)
            avail = [c for c in feat_cols if c in sub.columns]
            sub   = sub.dropna(subset=avail)
            mu    = sub[avail].mean().values.astype(np.float32)
            sigma = sub[avail].std().values.astype(np.float32) + 1e-8
            x_scaled = ((raw_row - mu) / sigma).astype(np.float32)

        # ── run models ────────────────────────────────────────────────────
        trio    = self._models[pair]
        models  = list(trio.items())
        probs_list: List[np.ndarray] = []

        for mname, (model, backend) in models:
            try:
                p = _predict_proba(model, backend, x_scaled)
                probs_list.append(p)
            except Exception as ex:
                print(f"  {Y}Model {mname} inference error: {ex}{X}")
                probs_list.append(np.array([1/3, 1/3, 1/3]))

        n_models = len(models)

        # ── coordinator: accuracy-proportional weights ────────────────────
        # If no pre-fitted weights are stored, use equal weights
        weights = np.ones(n_models) / n_models

        # ── weighted soft vote (notebook label order: BUY=0, SELL=1, HOLD=2) ─
        weighted_nb = sum(w * p for w, p in zip(weights, probs_list))

        # ── remap to central brain order: buy=0, hold=1, sell=2 ──────────
        # NB indices: 0=BUY, 1=SELL, 2=HOLD
        # CB indices: 0=buy, 1=hold, 2=sell
        p_buy  = float(weighted_nb[0])
        p_sell = float(weighted_nb[1])
        p_hold = float(weighted_nb[2])
        cb_probs = np.array([p_buy, p_hold, p_sell])  # [buy, hold, sell]

        # ── final signal ─────────────────────────────────────────────────
        cb_labels = ["buy", "hold", "sell"]
        final_idx  = int(cb_probs.argmax())
        signal     = cb_labels[final_idx]
        confidence = float(cb_probs[final_idx])

        # ── agreement check ───────────────────────────────────────────────
        all_nb_preds = [int(np.argmax(p)) for p in probs_list]
        all_cb_preds = [NB_LABEL_REV[i] for i in all_nb_preds]

        if len(set(all_cb_preds)) == 1:
            agreement = "UNANIMOUS"
        elif len(set(all_cb_preds)) == 2:
            agreement = "MAJORITY"
        else:
            agreement = "SPLIT"
            confidence *= 0.80   # apply split penalty (mirrors notebook logic)

        # ── confidence band ───────────────────────────────────────────────
        pct = confidence * 100
        strength = "HIGH" if pct >= 70 else ("MEDIUM" if pct >= 55 else "LOW")

        # ── model_votes in CB format ──────────────────────────────────────
        def _v(nb_p):
            return {"buy": float(nb_p[0]),
                    "hold": float(nb_p[2]),
                    "sell": float(nb_p[1])}

        model_votes = {
            mname: _v(p)
            for (mname, _), p in zip(models, probs_list)
        }

        return {
            "signal":      signal,
            "confidence":  confidence,
            "probs":       {"buy": p_buy, "hold": p_hold, "sell": p_sell},
            "raw_probs":   cb_probs,
            "model_votes": model_votes,
            "agreement":   agreement,
            "strength":    strength,
            "pair":        pair,
            "close_price": close,
            "date":        date,
            "available":   True,
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
        "buy":        round(result["probs"]["buy"],  4),
        "hold":       round(result["probs"]["hold"], 4),
        "sell":       round(result["probs"]["sell"], 4),
        "agreement":  result.get("agreement", "—"),
        "available":  result.get("available", False),
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


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

    print("\n" + "═" * W)
    print(f"  FX GEOPOLITICAL SIGNAL  —  {B}{pair}{X}")
    print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print("═" * W)

    if not result.get("available", False):
        print(f"\n  {Y}⚠  Agent unavailable: {result.get('error','unknown')}{X}")
        print("═" * W + "\n")
        return

    print(f"\n  SIGNAL      {col}{B}{icon}{X}")
    print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}  [{result.get('strength','?')}]")
    print(f"  AGREEMENT   {result.get('agreement','?')}")
    print(f"  DATE        {result.get('date','?')}  "
          f"  PRICE  {result.get('close_price','?')}\n")

    print("  PROBABILITY BREAKDOWN")
    for lbl in ["buy", "hold", "sell"]:
        print(_bar(lbl, prob[lbl]))

    mv = result.get("model_votes", {})
    if mv:
        print(f"\n  MODEL VOTES")
        labels = MODEL_LABELS
        for mname, votes in mv.items():
            ms  = max(votes, key=votes.get)
            mc  = votes[ms]
            msc = {"buy": G, "sell": R, "hold": Y}[ms]
            lbl = labels.get(mname, mname)
            print(f"  {lbl:<22s}  {msc}{ms.upper():<5s}{X}  {mc*100:.1f}%")

    print()
    print(f"  {Y}⚠  NOT FINANCIAL ADVICE.{X}")
    print("═" * W + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX Geopolitical Agent")
    parser.add_argument("--pair",   default="EURUSD",
                        help="Pair to predict, e.g. EURUSD  (use --all for all 4)")
    parser.add_argument("--all",    action="store_true",
                        help="Predict all 4 pairs")
    parser.add_argument("--models", default=None,
                        help="Override models directory")
    parser.add_argument("--data",   default=None,
                        help="Override path to fx_geopolitical_features.csv")
    args = parser.parse_args()

    mdir  = Path(args.models) if args.models else MODELS_DIR
    dpath = Path(args.data)   if args.data   else DATA_PATH

    predictor = GeopoliticalPredictor(models_dir=mdir, data_path=dpath)

    pairs = FX_PAIRS if args.all else [args.pair.upper().replace("/","").replace("-","")]

    for pair in pairs:
        print(f"\n{B}Predicting {pair}...{X}")
        result = predictor.predict(pair)
        print_result(pair, result)
        if result.get("available"):
            log_prediction(pair, result)
            print(f"  {C}Logged to {LOG_FILE}{X}\n")


if __name__ == "__main__":
    main()
