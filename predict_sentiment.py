"""
FX-ALPHALAB — Sentiment Agent
==============================
Loads 5 NLP models (LR + LightGBM + TextCNN + BiLSTM + DistilBERT),
fetches RSS news, and returns a buy/hold/sell signal.

Standalone usage:
    python predict_sentiment.py --pair EURUSD
    python predict_sentiment.py --pair EURUSD --text "ECB signals rate cuts"
    python predict_sentiment.py --monitor

Used by central_brain.py via:
    from predict_sentiment import SentimentPredictor, fetch_news
"""
from __future__ import annotations

import argparse, json, sys, textwrap, warnings
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
import joblib
import torch
import torch.nn as nn
from scipy.sparse import hstack, csr_matrix

# ══════════════════════════════════════════════════════════════════════════════
# NUMPY COMPAT
# ══════════════════════════════════════════════════════════════════════════════
def safe_load(path):
    try:
        return joblib.load(str(path))
    except ModuleNotFoundError as e:
        if "numpy._core" in str(e):
            raise RuntimeError(
                f"\nNumpy version mismatch loading {path}.\n"
                f"Fix: run  python resave_models.py  once, then retry.\n"
            ) from e
        raise

# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════
BASE_DIR     = Path(__file__).parent
MODELS_DIR   = BASE_DIR / "models" / "sentiment_agent"
LOG_FILE     = BASE_DIR / "sentiment.log"
MONITOR_FILE = BASE_DIR / "sentiment_monitor.json"

LABEL2ID: Dict[str,int] = {"buy":0, "hold":1, "sell":2}
ID2LABEL:  Dict[int,str]  = {0:"buy", 1:"hold", 2:"sell"}
CURRENCIES = ["USD","EUR","JPY","CHF","GBP"]
VOCAB_SIZE  = 30_000; MAX_SEQ_LEN = 128; EMBED_DIM = 128
NUM_FILTERS = 128;    KERNEL_SIZES = [2, 3, 4]
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"

PAIRS: Dict[str,str] = {
    "EURUSD":"EUR", "GBPUSD":"GBP", "USDJPY":"USD",
    "USDCHF":"USD", "EURJPY":"EUR", "GBPJPY":"GBP",
    # slash variants
    "EUR/USD":"EUR", "GBP/USD":"GBP", "USD/JPY":"USD",
    "USD/CHF":"USD", "EUR/JPY":"EUR", "GBP/JPY":"GBP",
}

RSS_FEEDS: Dict[str,List[str]] = {
    "EUR":["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
           "https://www.ecb.europa.eu/rss/press.html",
           "https://feeds.bbci.co.uk/news/business/rss.xml",
           "https://rss.cnn.com/rss/money_news_international.rss",
           "https://www.forexlive.com/feed/news"],
    "USD":["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
           "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml",
           "https://feeds.bbci.co.uk/news/business/rss.xml",
           "https://rss.cnn.com/rss/money_news_international.rss",
           "https://www.forexlive.com/feed/news"],
    "GBP":["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
           "https://www.bankofengland.co.uk/rss/news",
           "https://feeds.bbci.co.uk/news/business/rss.xml",
           "https://rss.cnn.com/rss/money_news_international.rss",
           "https://www.forexlive.com/feed/news"],
    "JPY":["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
           "https://www.boj.or.jp/en/rss/index.htm",
           "https://feeds.bbci.co.uk/news/business/rss.xml",
           "https://www.forexlive.com/feed/news"],
    "CHF":["https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
           "https://www.snb.ch/en/rss/pub",
           "https://feeds.bbci.co.uk/news/business/rss.xml",
           "https://www.forexlive.com/feed/news"],
}

KW: Dict[str,List[str]] = {
    "EUR":["euro","eur","ecb","eurozone","european central bank","lagarde","euro area"],
    "USD":["dollar","usd","fed","federal reserve","fomc","powell","us economy","rate hike","treasury"],
    "GBP":["pound","gbp","boe","bank of england","bailey","sterling","uk economy","britain"],
    "JPY":["yen","jpy","boj","bank of japan","ueda","japan","nikkei","tokyo"],
    "CHF":["franc","chf","snb","swiss national bank","switzerland","zurich"],
}

# ══════════════════════════════════════════════════════════════════════════════
# MODEL ARCHITECTURES
# ══════════════════════════════════════════════════════════════════════════════
class TextCNN(nn.Module):
    def __init__(self, vocab_size=VOCAB_SIZE, embed_dim=EMBED_DIM,
                 num_filters=NUM_FILTERS, kernel_sizes=None, num_classes=3, dropout=0.4):
        super().__init__()
        if kernel_sizes is None: kernel_sizes = KERNEL_SIZES
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([nn.Conv1d(embed_dim, num_filters, k) for k in kernel_sizes])
        self.drop  = nn.Dropout(dropout)
        self.fc    = nn.Linear(num_filters * len(kernel_sizes), num_classes)

    def forward(self, x):
        e = self.embed(x).permute(0, 2, 1)
        return self.fc(self.drop(
            torch.cat([torch.relu(c(e)).max(dim=2).values for c in self.convs], 1)
        ))

class SelfAttention(nn.Module):
    def __init__(self, h: int):
        super().__init__()
        self.attn = nn.Linear(h * 2, 1, bias=False)
    def forward(self, o):
        return (o * torch.softmax(self.attn(o), 1)).sum(1)

class BiLSTMAttn(nn.Module):
    def __init__(self, vocab_size=VOCAB_SIZE, embed_dim=EMBED_DIM,
                 hidden_dim=128, n_layers=2, num_classes=3, dropout=0.4):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm  = nn.LSTM(embed_dim, hidden_dim, num_layers=n_layers,
                             bidirectional=True, batch_first=True,
                             dropout=dropout if n_layers > 1 else 0.0)
        self.attn  = SelfAttention(hidden_dim)
        self.drop  = nn.Dropout(dropout)
        self.fc    = nn.Linear(hidden_dim * 2, num_classes)

    def forward(self, x):
        o, _ = self.lstm(self.embed(x))
        return self.fc(self.drop(self.attn(o)))

# ══════════════════════════════════════════════════════════════════════════════
# NEWS FETCHER
# ══════════════════════════════════════════════════════════════════════════════
def fetch_news(currency: str, max_articles: int = 15) -> List[Dict]:
    try:
        import feedparser
    except ImportError:
        print(f"{Y}pip install feedparser{X}"); return []

    articles = []; keywords = KW.get(currency.upper(), [])
    print(f"  {C}Fetching {currency} news...{X}")
    for url in RSS_FEEDS.get(currency.upper(), []):
        try:
            feed = feedparser.parse(url)
            for e in feed.entries:
                t = e.get("title", "").strip()
                s = e.get("summary", e.get("description", "")).strip()
                if any(kw in (t + " " + s).lower() for kw in keywords):
                    articles.append({
                        "title":     t,
                        "summary":   s[:300],
                        "source":    feed.feed.get("title", url),
                        "published": e.get("published", ""),
                        "text":      f"{t}. {s[:200]}".strip(),
                    })
        except Exception as ex:
            print(f"  {Y}Feed error: {type(ex).__name__}{X}")

    seen = set(); unique = []
    for a in articles:
        if a["title"] not in seen:
            seen.add(a["title"]); unique.append(a)
    print(f"  {G}Found {len(unique)} relevant {currency} articles.{X}\n")
    return unique[:max_articles]

# ══════════════════════════════════════════════════════════════════════════════
# SENTIMENT PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════
class SentimentPredictor:
    """
    Loads all 5 NLP models and exposes a single predict() method.

    predict(text, currency) → {
        "signal":      "buy" | "hold" | "sell",
        "confidence":  float,
        "probs":       {"buy": float, "hold": float, "sell": float},
        "raw_probs":   np.ndarray,          # shape (3,) — for meta-model
        "model_votes": {model_name: {"buy": float, "hold": float, "sell": float}},
        "available":   True,
    }
    """
    def __init__(self, models_dir: Path = MODELS_DIR):
        self.dir = Path(models_dir)
        self._check()
        print(f"\n{B}Loading models...{X}")
        self._lr(); self._lgb(); self._cnn(); self._lstm(); self._bert()
        self._stacker()
        print(f"{G}{B}All 5 models loaded.{X}\n")

    # ── file checks ──────────────────────────────────────────────────────────
    def _check(self):
        bert_v2 = self.dir / "distilbert_finetuned" / "config.json"
        bert_v1 = self.dir / "finbert_finetuned"    / "config.json"
        self.bert_dir = (
            str(self.dir / "distilbert_finetuned") if bert_v2.exists() else
            str(self.dir / "finbert_finetuned")    if bert_v1.exists() else None
        )
        required = ["model_lr.pkl","tfidf_vectorizer.pkl","model_lgb.pkl",
                    "model_textcnn.pt","textcnn_vocab.pkl","model_bilstm.pt"]
        missing = [f for f in required if not (self.dir / f).exists()]
        if self.bert_dir is None:
            missing.append("distilbert_finetuned/ or finbert_finetuned/")
        if missing:
            print(f"\n{R}Missing model files:{X}")
            for f in missing: print(f"  {R}✗ {f}{X}")
            sys.exit(1)
        model_type = "DistilBERT" if self.bert_dir and "distilbert" in self.bert_dir else "FinBERT"
        print(f"{G}✓ All files found  ({model_type} detected){X}")

    # ── loaders ──────────────────────────────────────────────────────────────
    def _lr(self):
        print("  [1/5] Logistic Regression ...", end=" ", flush=True)
        self.lr_pipe   = safe_load(self.dir / "model_lr.pkl")
        self.tfidf_vec = safe_load(self.dir / "tfidf_vectorizer.pkl")
        print(f"{G}OK{X}")

    def _lgb(self):
        print("  [2/5] LightGBM          ...", end=" ", flush=True)
        self.lgb_model = safe_load(self.dir / "model_lgb.pkl")
        print(f"{G}OK{X}")

    def _cnn(self):
        print("  [3/5] TextCNN           ...", end=" ", flush=True)
        v = safe_load(self.dir / "textcnn_vocab.pkl")
        self.w2i = v["word2idx"]; self.cnn_len = v["max_len"]
        self.cnn = TextCNN().to(DEVICE)
        self.cnn.load_state_dict(torch.load(
            self.dir / "model_textcnn.pt", map_location=DEVICE, weights_only=True))
        self.cnn.eval()
        print(f"{G}OK{X}")

    def _lstm(self):
        print("  [4/5] BiLSTM+Attention  ...", end=" ", flush=True)
        self.lstm_model = BiLSTMAttn().to(DEVICE)
        self.lstm_model.load_state_dict(torch.load(
            self.dir / "model_bilstm.pt", map_location=DEVICE, weights_only=True))
        self.lstm_model.eval()
        print(f"{G}OK{X}")

    def _bert(self):
        print("  [5/5] Transformer       ...", end=" ", flush=True)
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        self.btok = AutoTokenizer.from_pretrained(self.bert_dir)
        self.bmod = AutoModelForSequenceClassification.from_pretrained(
            self.bert_dir).to(DEVICE)
        self.bmod.eval()
        print(f"{G}OK{X}")

    def _stacker(self):
        stacker_path = self.dir / "stacker.pkl"
        if stacker_path.exists():
            self.stacker = safe_load(stacker_path)
            self.weights = None
            print(f"  {G}  [stacker] Stacking meta-model loaded ✓{X}")
        else:
            self.stacker = None
            self.weights = {"lr":0.08,"lgb":0.12,"textcnn":0.15,
                            "bilstm":0.25,"distilbert":0.40,"finbert":0.40}
            print(f"  {Y}  [stacker] No stacker.pkl — using fixed weights.{X}")

    # ── helpers ──────────────────────────────────────────────────────────────
    def _tok(self, text):
        ids = [self.w2i.get(w.lower(), 1) for w in str(text).split()]
        ids = ids[:self.cnn_len] + [0] * max(0, self.cnn_len - len(ids))
        return torch.tensor([ids], dtype=torch.long).to(DEVICE)

    @staticmethod
    def _sfx(x):
        e = np.exp(x - x.max()); return e / e.sum()

    # ── main inference ────────────────────────────────────────────────────────
    def predict(self, text: str, currency: str) -> Dict:
        """
        Run all 5 models on a single text snippet.
        Returns the standard agent dict consumed by central_brain.py.
        """
        currency = currency.upper()

        lr_p = self.lr_pipe.predict_proba([text])[0]

        tf  = self.tfidf_vec.transform([text])
        ohe = np.array([[1.0 if c == currency else 0.0 for c in CURRENCIES]])
        lgb_p = self.lgb_model.predict_proba(
            hstack([tf, csr_matrix(np.hstack([[0.0], ohe[0]]).reshape(1, -1))]))[0]

        tok = self._tok(text)
        with torch.no_grad():
            cnn_p  = torch.softmax(self.cnn(tok),        1).cpu().numpy()[0]
            lstm_p = torch.softmax(self.lstm_model(tok),  1).cpu().numpy()[0]
            enc    = self.btok(str(text), truncation=True, padding="max_length",
                               max_length=128, return_tensors="pt").to(DEVICE)
            bert_p = self._sfx(self.bmod(**enc).logits.cpu().numpy()[0])

        # ensemble
        if self.stacker is not None:
            X_stack = np.concatenate([lr_p, lgb_p, cnn_p, lstm_p, bert_p]).reshape(1, -1)
            ens = self.stacker.predict_proba(X_stack)[0]
        else:
            W = self.weights
            ens = (W.get("lr",0.08)      * lr_p  +
                   W.get("lgb",0.12)     * lgb_p +
                   W.get("textcnn",0.15) * cnn_p +
                   W.get("bilstm",0.25)  * lstm_p +
                   W.get("distilbert", W.get("finbert", 0.40)) * bert_p)

        def _v(a): return {"buy": float(a[0]), "hold": float(a[1]), "sell": float(a[2])}

        return {
            "signal":      ID2LABEL[int(ens.argmax())],
            "confidence":  float(ens.max()),
            "probs":       _v(ens),
            "raw_probs":   ens.astype(float),
            "model_votes": {
                "lr":          _v(lr_p),
                "lgb":         _v(lgb_p),
                "textcnn":     _v(cnn_p),
                "bilstm":      _v(lstm_p),
                "transformer": _v(bert_p),
            },
            "available": True,
        }

    def predict_articles(self, articles: List[Dict], currency: str) -> Dict:
        """
        Run predict() over a list of article dicts and average results.
        Each article must have a 'text' key.
        Returns same dict shape as predict() plus 'articles_used'.
        """
        if not articles:
            neutral = {"buy": 0.333, "hold": 0.334, "sell": 0.333}
            return {"signal":"hold","confidence":0.333,"probs":neutral,
                    "raw_probs":np.array([0.333,0.334,0.333]),
                    "model_votes":{},"articles_used":0,"available":True}

        all_p: Dict[str,List] = {"buy":[],"hold":[],"sell":[]}
        all_mv: Dict[str,Dict[str,List]] = {}

        for art in articles:
            r = self.predict(art["text"], currency)
            for lbl in ["buy","hold","sell"]:
                all_p[lbl].append(r["probs"][lbl])
            for mname, mv in r["model_votes"].items():
                if mname not in all_mv:
                    all_mv[mname] = {"buy":[],"hold":[],"sell":[]}
                for lbl in ["buy","hold","sell"]:
                    all_mv[mname][lbl].append(mv[lbl])

        avg  = {lbl: float(np.mean(v)) for lbl, v in all_p.items()}
        sig  = max(avg, key=avg.get)
        raw  = np.array([avg["buy"], avg["hold"], avg["sell"]])
        avg_mv = {m: {lbl: float(np.mean(v)) for lbl,v in d.items()}
                  for m,d in all_mv.items()}

        return {
            "signal":       sig,
            "confidence":   float(avg[sig]),
            "probs":        avg,
            "raw_probs":    raw,
            "model_votes":  avg_mv,
            "articles_used": len(articles),
            "available":    True,
        }

# ══════════════════════════════════════════════════════════════════════════════
# LOGGING / MONITOR
# ══════════════════════════════════════════════════════════════════════════════
def log_prediction(pair: str, result: Dict, articles_count: int):
    entry = {
        "ts":         datetime.now().isoformat(),
        "pair":       pair,
        "signal":     result["signal"],
        "confidence": round(result["confidence"], 4),
        "buy":        round(result["probs"]["buy"],  4),
        "hold":       round(result["probs"]["hold"], 4),
        "sell":       round(result["probs"]["sell"], 4),
        "articles":   articles_count,
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

    stats = {}
    if MONITOR_FILE.exists():
        try: stats = json.loads(MONITOR_FILE.read_text())
        except: pass
    p = pair.replace("/", "-")
    if p not in stats:
        stats[p] = {"total":0,"buy":0,"hold":0,"sell":0,"avg_confidence":0.0,"last":""}
    s = stats[p]; s["total"] += 1; s[result["signal"]] += 1
    s["avg_confidence"] = round(
        (s["avg_confidence"] * (s["total"] - 1) + result["confidence"]) / s["total"], 4)
    s["last"] = entry["ts"]
    MONITOR_FILE.write_text(json.dumps(stats, indent=2))

def show_monitor():
    W = 64
    print("\n" + "═"*W)
    print(f"  {B}FX SENTIMENT MONITOR{X}")
    print("═"*W)
    if not MONITOR_FILE.exists():
        print(f"  {Y}No predictions yet. Run: make run{X}\n"); return
    stats = json.loads(MONITOR_FILE.read_text())
    for pair, s in stats.items():
        total = s["total"]
        bp = s["buy"]/total*100; hp = s["hold"]/total*100; sp = s["sell"]/total*100
        conf = s["avg_confidence"]*100
        cc = G if conf >= 60 else Y if conf >= 45 else R
        print(f"\n  {B}{pair.replace('-','/')}{X}  ({total} predictions)  Last: {s['last'][:19]}")
        print(f"  Avg confidence: {cc}{conf:.1f}%{X}")
        bw = 24
        print(f"    {G}BUY  {'█'*int(bp/100*bw)}{'░'*(bw-int(bp/100*bw))}{X}  {bp:4.1f}%  ({s['buy']}x)")
        print(f"    {Y}HOLD {'█'*int(hp/100*bw)}{'░'*(bw-int(hp/100*bw))}{X}  {hp:4.1f}%  ({s['hold']}x)")
        print(f"    {R}SELL {'█'*int(sp/100*bw)}{'░'*(bw-int(sp/100*bw))}{X}  {sp:4.1f}%  ({s['sell']}x)")
    if LOG_FILE.exists():
        lines = [json.loads(l) for l in LOG_FILE.read_text().strip().split("\n")[-5:] if l.strip()]
        print(f"\n  {B}Last 5 predictions:{X}")
        for e in reversed(lines):
            sc = {"buy":G,"sell":R,"hold":Y}[e["signal"]]
            print(f"  {e['ts'][:19]}  {e['pair']:<10s}  {sc}{e['signal'].upper():<5s}{X}  {e['confidence']*100:.1f}%")
    print(); print(f"  Log: {LOG_FILE}"); print("═"*W+"\n")

def tail_monitor():
    import time
    print(f"\n{B}Live tailing {LOG_FILE} (Ctrl+C to stop)...{X}\n")
    if not LOG_FILE.exists(): LOG_FILE.write_text("")
    with open(LOG_FILE) as f:
        f.seek(0, 2)
        while True:
            line = f.readline()
            if line:
                try:
                    e = json.loads(line); sc = {"buy":G,"sell":R,"hold":Y}[e["signal"]]
                    print(f"{e['ts'][:19]}  {e['pair']:<10s}  {sc}{e['signal'].upper():<5s}{X}  "
                          f"{e['confidence']*100:.1f}%  ({e['articles']} articles)")
                except: print(line.strip())
            else: time.sleep(1)

# ══════════════════════════════════════════════════════════════════════════════
# PRETTY PRINT
# ══════════════════════════════════════════════════════════════════════════════
def _bar(label, value, width=28):
    col = {"buy":G, "sell":R, "hold":Y}.get(label, X)
    return f"  {label.upper():<5s}  {col}{'█'*int(value*width)}{'░'*(width-int(value*width))}{X}  {value*100:5.1f}%"

def print_result(pair, result, articles):
    sig  = result["signal"]; conf = result["confidence"]; prob = result["probs"]
    col  = {"buy":G,"sell":R,"hold":Y}[sig]
    icon = {"buy":"▲  BUY","sell":"▼  SELL","hold":"●  HOLD"}[sig]
    W    = 64
    print("\n" + "═"*W)
    print(f"  FX SENTIMENT SIGNAL  —  {B}{pair}{X}")
    print(f"  {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}")
    print("═"*W)
    print(f"\n  SIGNAL      {col}{B}{icon}{X}")
    print(f"  CONFIDENCE  {B}{conf*100:.1f}%{X}\n")
    print("  PROBABILITY BREAKDOWN")
    for lbl in ["buy","hold","sell"]: print(_bar(lbl, prob[lbl]))
    print()
    mw = {"lr":0.08,"lgb":0.12,"textcnn":0.15,"bilstm":0.25,"transformer":0.40}
    mn = {"lr":"Logistic Regression","lgb":"LightGBM","textcnn":"TextCNN",
          "bilstm":"BiLSTM+Attention","transformer":"DistilBERT (fine-tuned)"}
    print("  HOW EACH MODEL VOTED")
    for name, votes in result["model_votes"].items():
        ms  = max(votes, key=votes.get); mc = votes[ms]
        mc2 = {"buy":G,"sell":R,"hold":Y}[ms]
        print(f"  {mc2}{mn.get(name,name):<28s}  →  {ms.upper():<5s} {mc*100:.1f}%{X}  "
              f"{C}(weight {mw.get(name,0)*100:.0f}%){X}")
    print()
    cast   = [max(v, key=v.get) for v in result["model_votes"].values()]
    counts = {s: cast.count(s) for s in ["buy","hold","sell"]}
    maj    = max(counts, key=counts.get); n = counts[maj]
    note   = {5:"Complete agreement.",4:"Strong consensus.",3:"Slim majority.",
              2:"No clear consensus.",1:"No consensus."}.get(n,"")
    print(f"  {n}/5 models voted {B}{maj.upper()}{X}. {note}\n")
    if articles:
        print(f"  NEWS ARTICLES ANALYSED  ({len(articles)} total)")
        for i, a in enumerate(articles[:5], 1):
            t = a["title"][:68] + ("…" if len(a["title"]) > 68 else "")
            print(f"  {C}{i}.{X} {t}"); print(f"     {Y}{a['source']}{X}")
        if len(articles) > 5: print(f"  … and {len(articles)-5} more.")
    else:
        print(f"  {Y}Prediction based on manual text input.{X}")
    print(); print(f"  {Y}⚠  NOT FINANCIAL ADVICE. Educational use only.{X}"); print("═"*W+"\n")

# ══════════════════════════════════════════════════════════════════════════════
# STANDALONE CLI
# ══════════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="FX Sentiment Agent")
    parser.add_argument("--pair",     default="EURUSD")
    parser.add_argument("--currency", default=None)
    parser.add_argument("--text",     default=None)
    parser.add_argument("--articles", type=int, default=10)
    parser.add_argument("--monitor",  action="store_true")
    parser.add_argument("--tail",     action="store_true")
    args = parser.parse_args()

    if args.monitor and args.tail: tail_monitor(); return
    if args.monitor: show_monitor(); return

    pair     = args.pair.upper().replace("-", "/").replace("_","")
    currency = (args.currency.upper() if args.currency
                else PAIRS.get(pair, pair[:3]))
    if currency not in CURRENCIES:
        print(f"{R}Unknown currency '{currency}'.{X}"); sys.exit(1)

    predictor = SentimentPredictor()

    if args.text:
        print(f'{B}Manual text:{X} "{args.text}"')
        result = predictor.predict(args.text, currency)
        print_result(pair, result, [])
        log_prediction(pair, result, 0)
        return

    articles = fetch_news(currency, max_articles=args.articles)
    if not articles:
        print(f"{Y}No articles found.{X}"); sys.exit(0)

    print(f"{B}Running ensemble on {len(articles)} articles...{X}\n")
    result = predictor.predict_articles(articles, currency)
    print_result(pair, result, articles)
    log_prediction(pair, result, len(articles))
    print(f"  {C}Logged to {LOG_FILE}{X}\n")

if __name__ == "__main__":
    main()
