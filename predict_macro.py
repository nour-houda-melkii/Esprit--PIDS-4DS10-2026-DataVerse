"""
FX-ALPHALAB — Macro Agent
==========================
Wraps fx_macro_signal_predictor.py: fetches macro/news from multiple sources,
scores each currency via LLaMA (hawkishness, inflation, growth, risk-sentiment),
derives pair-level signals, and returns the standard agent dict consumed by
central_brain.py.

NOTE — no trained models needed. This agent is fully LLM-based.

Standalone usage:
    python predict_macro.py --pair EURUSD --key YOUR_KEY
    python predict_macro.py --pair GBPUSD   (key from TOKENFACTORY_KEY env var)

Used by central_brain.py via:
    from predict_macro import MacroPredictor

IMPORTANT — rename script.py to fx_macro_signal_predictor.py first:
    rename script.py fx_macro_signal_predictor.py   (Windows)
    mv script.py fx_macro_signal_predictor.py       (Linux/WSL)
"""
from __future__ import annotations
from dotenv import load_dotenv
import os

load_dotenv()
import argparse, json, os, sys, time, warnings
from datetime import datetime, timezone
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

# ── import the actual macro script ────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
try:
    from fx_macro_signal_predictor import predict as _macro_predict
    _MACRO_AVAILABLE = True
except ImportError:
    try:
        from script import predict as _macro_predict      # fallback if not yet renamed
        _MACRO_AVAILABLE = True
    except ImportError:
        _MACRO_AVAILABLE = False
        _macro_predict = None

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR = Path(__file__).parent
LOG_FILE = BASE_DIR / "macro.log"

# pair "EURUSD" → ("EUR", "USD")
PAIR_PARTS: Dict[str, Tuple[str, str]] = {
    "EURUSD": ("EUR", "USD"),
    "GBPUSD": ("GBP", "USD"),
    "USDJPY": ("USD", "JPY"),
    "USDCHF": ("USD", "CHF"),
    "EURJPY": ("EUR", "JPY"),
    "GBPJPY": ("GBP", "JPY"),
}

# How long (seconds) to reuse a full macro run before fetching again
_CACHE_TTL = 1800   # 30 minutes


# ══════════════════════════════════════════════════════════════════════════════
# SCORE → PROBABILITY CONVERSION
# ══════════════════════════════════════════════════════════════════════════════
def _score_to_probs(pair_score: float, confidence: float) -> np.ndarray:
    """
    Convert a pair_score in [-1, 1] and a confidence in [0, 1]
    into a [buy, hold, sell] probability array that sums to 1.

    Logic:
      • Normalise pair_score to [0, 1]:  norm = (score + 1) / 2
      • Directional mass = confidence allocated to buy/sell:
            buy_raw  = norm  * confidence
            sell_raw = (1-norm) * confidence
      • Remaining mass = (1 - confidence) goes to hold
      • Renormalise so the 3 values sum exactly to 1.
    """
    score = float(np.clip(pair_score, -1.0, 1.0))
    conf  = float(np.clip(confidence, 0.0,  1.0))

    norm     = (score + 1.0) / 2.0          # 0 = pure sell, 1 = pure buy
    buy_raw  = norm       * conf
    sell_raw = (1.0-norm) * conf
    hold_raw = 1.0 - conf                    # uncertainty → hold

    probs = np.array([buy_raw, hold_raw, sell_raw], dtype=float)
    total = probs.sum()
    if total > 1e-9:
        probs /= total
    else:
        probs = np.array([1/3, 1/3, 1/3])

    return probs                             # [buy, hold, sell]


# ══════════════════════════════════════════════════════════════════════════════
# MACRO PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════
class MacroPredictor:
    """
    Calls the LLM-based macro pipeline once per session (cached for 30 min)
    and extracts the signal for the requested pair.

    predict(pair) → {
        "signal":      "buy" | "hold" | "sell",
        "confidence":  float,
        "probs":       {"buy": f, "hold": f, "sell": f},
        "raw_probs":   np.ndarray shape (3,),   # [buy, hold, sell]
        "pair_score":  float,                   # raw LLM pair score
        "base_score":  float,                   # base currency score
        "quote_score": float,                   # quote currency score
        "summary":     str,
        "drivers":     List[str],
        "available":   bool,
    }
    """

    def __init__(self, api_key: Optional[str] = None):
        # Accept TOKENFACTORY_KEY (used everywhere else) OR TOKENFACTORY_API_KEY
        self.api_key = (
            api_key
            or os.getenv("TOKENFACTORY_KEY", "")
            or os.getenv("TOKENFACTORY_API_KEY", "")
        )
        self._cache: Optional[Dict] = None
        self._cache_ts: float       = 0.0

        if not _MACRO_AVAILABLE:
            print(f"  {R}✗ fx_macro_signal_predictor.py not found.{X}")
            print(f"  {Y}  Rename script.py → fx_macro_signal_predictor.py{X}")
        else:
            print(f"  {G}✓ Macro script loaded (LLM-based, no models required){X}")

    # ── helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _unavailable(reason: str = "") -> Dict:
        neutral = np.array([1/3, 1/3, 1/3])
        return {
            "signal":      "hold",
            "confidence":  1/3,
            "probs":       {"buy": 1/3, "hold": 1/3, "sell": 1/3},
            "raw_probs":   neutral,
            "pair_score":  0.0,
            "base_score":  0.0,
            "quote_score": 0.0,
            "summary":     reason,
            "drivers":     [],
            "available":   False,
        }

    def _get_macro_data(self) -> Optional[Dict]:
        """Run the full macro pipeline (or return cache if still fresh)."""
        now = time.time()
        if self._cache is not None and (now - self._cache_ts) < _CACHE_TTL:
            print(f"  {C}  [macro] Using cached macro data "
                  f"({int((_CACHE_TTL - (now - self._cache_ts)) / 60)} min remaining){X}")
            return self._cache

        if not _MACRO_AVAILABLE:
            return None
        if not self.api_key:
            print(f"  {R}  [macro] No API key — set TOKENFACTORY_KEY env var.{X}")
            return None

        print(f"  {C}  [macro] Fetching live macro/news data via LLM...{X}")
        try:
            data = _macro_predict(api_key=self.api_key, include_pairs=True)
            self._cache    = data
            self._cache_ts = time.time()
            return data
        except Exception as e:
            print(f"  {Y}  [macro] Pipeline error: {e}{X}")
            return None

    # ── main inference ────────────────────────────────────────────────────────
    def predict(self, pair: str) -> Dict:
        """Return a standard agent dict for the requested pair."""
        pair = pair.upper().replace("/", "").replace("-", "")
        parts = PAIR_PARTS.get(pair)
        if parts is None:
            return self._unavailable(f"Unsupported pair: {pair}")

        base, quote = parts

        data = self._get_macro_data()
        if data is None:
            return self._unavailable("Macro pipeline unavailable.")

        # ── find matching pair signal ─────────────────────────────────────────
        pair_signal_row = None
        for ps in data.get("pair_signals", []):
            b = ps.get("base", "").upper()
            q = ps.get("quote", "").upper()
            if b == base and q == quote:
                pair_signal_row = ps
                break

        if pair_signal_row is None:
            return self._unavailable(
                f"Pair {base}/{quote} not found in macro output.")

        pair_score  = float(pair_signal_row.get("pair_score",  0.0))
        macro_conf  = float(pair_signal_row.get("confidence",  0.0))
        raw_signal  = str(pair_signal_row.get("signal", "HOLD")).upper()

        # "BUY EUR/USD" / "SELL EUR/USD" / "HOLD EUR/USD" → "buy" / "sell" / "hold"
        if raw_signal.startswith("BUY"):
            signal = "buy"
        elif raw_signal.startswith("SELL"):
            signal = "sell"
        else:
            signal = "hold"

        probs = _score_to_probs(pair_score, macro_conf)

        # ── pull summary & drivers from base currency signal ──────────────────
        summary = ""
        drivers: List[str] = []
        for cs in data.get("currency_signals", []):
            if cs.get("currency", "").upper() == base:
                summary = cs.get("summary", "")
                drivers = cs.get("drivers", [])
                break

        base_score  = float(pair_signal_row.get("base_score",  0.0))
        quote_score = float(pair_signal_row.get("quote_score", 0.0))

        return {
            "signal":      signal,
            "confidence":  float(probs[{"buy": 0, "hold": 1, "sell": 2}[signal]]),
            "probs":       {"buy":  float(probs[0]),
                            "hold": float(probs[1]),
                            "sell": float(probs[2])},
            "raw_probs":   probs,
            "pair_score":  round(pair_score,  4),
            "base_score":  round(base_score,  4),
            "quote_score": round(quote_score, 4),
            "summary":     summary,
            "drivers":     drivers,
            "available":   True,
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
    print(f"  MACRO SIGNAL  —  {B}{pair}{X}")
    print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print("═"*W)
    print(f"\n  SIGNAL      {col}{B}{icon}{X}")
    print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}")
    print(f"  PAIR SCORE  {result['pair_score']:+.4f}  "
          f"(Base {result['base_score']:+.4f}  |  Quote {result['quote_score']:+.4f})\n")

    print("  PROBABILITY BREAKDOWN")
    for lbl in ["buy", "hold", "sell"]:
        print(_bar(lbl, prob[lbl]))

    if result.get("summary"):
        import textwrap
        print(f"\n  MACRO SUMMARY")
        for line in textwrap.wrap(result["summary"], width=W - 4):
            print(f"  {line}")

    drivers = result.get("drivers", [])
    if drivers:
        print(f"\n  KEY DRIVERS")
        for d in drivers[:5]:
            print(f"  {C}•{X} {d}")

    if not result["available"]:
        print(f"\n  {R}UNAVAILABLE: {result.get('summary','')}{X}")

    print()
    print(f"  {Y}⚠  NOT FINANCIAL ADVICE. Educational use only.{X}")
    print("═"*W + "\n")


def log_prediction(pair: str, result: Dict):
    entry = {
        "ts":          datetime.now(timezone.utc).isoformat(),
        "pair":        pair,
        "signal":      result["signal"],
        "confidence":  round(result["confidence"], 4),
        "pair_score":  result.get("pair_score", 0.0),
        "available":   result["available"],
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX Macro Agent")
    parser.add_argument("--pair", default="EURUSD",
                        help="Currency pair, e.g. EURUSD, GBPUSD")
    parser.add_argument("--key",  default=None,
                        help="TokenFactory API key (or set TOKENFACTORY_KEY env var)")
    args = parser.parse_args()

    pair = args.pair.upper().replace("-", "").replace("/", "")
    if pair not in PAIR_PARTS:
        print(f"{R}Unknown pair '{pair}'. Supported: {list(PAIR_PARTS.keys())}{X}")
        sys.exit(1)

    predictor = MacroPredictor(api_key=args.key)
    result    = predictor.predict(pair)
    print_result(pair, result)
    log_prediction(pair, result)
    print(f"  {C}Logged to {LOG_FILE}{X}\n")


if __name__ == "__main__":
    main()