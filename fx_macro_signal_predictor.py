"""
fx_macro_signal_predictor.py

Predict currency-level macro/news signals with confidence, ready to integrate
with an orchestrator that combines multiple agents.

Usage:
    from fx_macro_signal_predictor import predict
    result = predict()

Environment variables:
    TOKENFACTORY_API_KEY   required
    TOKENFACTORY_BASE_URL  optional, default: https://tokenfactory.esprit.tn/api
    TOKENFACTORY_MODEL     optional, default: hosted_vllm/Llama-3.1-70B-Instruct
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import feedparser
import pandas as pd
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

try:
    from openai import OpenAI
except ImportError as exc:
    raise ImportError(
        "Missing dependency 'openai'. Install it with: pip install openai"
    ) from exc


# =========================
# Configuration
# =========================

DEFAULT_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF"]
DEFAULT_LOOKBACK_DAYS = 5
DEFAULT_MAX_ARTICLES_PER_CURRENCY = 12
DEFAULT_MODEL = os.getenv("TOKENFACTORY_MODEL", "hosted_vllm/Llama-3.1-70B-Instruct")
DEFAULT_BASE_URL = os.getenv("TOKENFACTORY_BASE_URL", "https://tokenfactory.esprit.tn/api")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
    )
}

SOURCES = [
    {
        "name": "FXStreet Forex News RSS",
        "type": "rss",
        "url": "https://www.fxstreet.com/rss/news",
        "tags": ["GLOBAL", "USD", "EUR", "GBP", "JPY", "CHF"],
    },
    {
        "name": "Reuters Currencies",
        "type": "html",
        "url": "https://www.reuters.com/markets/currencies/",
        "tags": ["GLOBAL", "USD", "EUR", "GBP", "JPY", "CHF"],
    },
    {
        "name": "ECB Press Releases RSS",
        "type": "rss",
        "url": "https://www.ecb.europa.eu/rss/press.html",
        "tags": ["EUR"],
    },
    {
        "name": "Bank of England News RSS",
        "type": "rss",
        "url": "https://www.bankofengland.co.uk/rss/news",
        "tags": ["GBP"],
    },
    {
        "name": "SNB News",
        "type": "html",
        "url": "https://www.snb.ch/en/the-snb/mandates-goals/statistics/statistics-pub/current_interest_exchange_rates",
        "tags": ["CHF"],
    },
    {
        "name": "Federal Reserve News",
        "type": "html",
        "url": "https://www.federalreserve.gov/newsevents.htm",
        "tags": ["USD"],
    },
    {
        "name": "Bank of Japan News",
        "type": "html",
        "url": "https://www.boj.or.jp/en/announcements/release_2026/index.htm/",
        "tags": ["JPY"],
    },
]

SYSTEM_PROMPT = """
You are a macro-FX analyst.

Your job is to assess whether recent news is bullish or bearish for ONE currency.
You must consider:
- central-bank tone (hawkish, dovish, neutral),
- inflation implications,
- growth implications,
- risk sentiment / safe-haven effects,
- commodity shock effects,
- whether the news is actually relevant to the target currency.

Return ONLY valid JSON with this schema:
{
  "currency": "USD",
  "stance": "bullish|bearish|neutral",
  "score": 0.0,
  "confidence": 0.0,
  "summary": "short explanation",
  "drivers": ["driver1", "driver2", "driver3"],
  "used_headlines": ["headline 1", "headline 2", "headline 3"]
}

Rules:
- score must be between -1 and 1
- confidence must be between 0 and 1
- be conservative when evidence is weak or mixed
- ignore irrelevant headlines
- do not add markdown
- do not add commentary outside JSON
""".strip()


@dataclass
class PredictorConfig:
    currencies: List[str] = None
    lookback_days: int = DEFAULT_LOOKBACK_DAYS
    max_articles_per_currency: int = DEFAULT_MAX_ARTICLES_PER_CURRENCY
    model: str = DEFAULT_MODEL
    base_url: str = DEFAULT_BASE_URL
    temperature: float = 0.1
    max_tokens: int = 500
    sleep_between_sources: float = 0.5
    sleep_between_llm_calls: float = 0.7

    def __post_init__(self) -> None:
        if self.currencies is None:
            self.currencies = list(DEFAULT_CURRENCIES)


# =========================
# Helpers
# =========================

def get_client(api_key: Optional[str] = None, base_url: Optional[str] = None) -> OpenAI:
    key = api_key or os.getenv("TOKENFACTORY_API_KEY")
    if not key:
        raise ValueError(
            "Missing API key. Set TOKENFACTORY_API_KEY in your environment."
        )
    return OpenAI(
        api_key=key,
        base_url=base_url or DEFAULT_BASE_URL,
        timeout=60.0,
    )


def clean_text(text: Any) -> str:
    if text is None:
        return ""
    text = re.sub(r"<[^>]+>", " ", str(text))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = dateparser.parse(str(value))
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def safe_get(url: str, timeout: int = 25) -> Optional[requests.Response]:
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        response.raise_for_status()
        return response
    except Exception:
        return None


def infer_currency_mentions(text: str) -> List[str]:
    text_low = clean_text(text).lower()
    mapping = {
        "USD": ["usd", "dollar", "federal reserve", "fed", "u.s.", "united states"],
        "EUR": ["eur", "euro", "ecb", "european central bank", "eurozone"],
        "GBP": ["gbp", "pound", "sterling", "bank of england", "boe", "uk", "britain"],
        "JPY": ["jpy", "yen", "bank of japan", "boj", "japan"],
        "CHF": ["chf", "swiss franc", "snb", "swiss national bank", "switzerland"],
    }
    found = []
    for ccy, keywords in mapping.items():
        if any(k in text_low for k in keywords):
            found.append(ccy)
    return found


def article_hash(title: str, link: str) -> str:
    payload = f"{clean_text(title)}||{clean_text(link)}".encode("utf-8")
    return hashlib.md5(payload).hexdigest()


def extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError(f"LLM did not return valid JSON: {text[:300]}")
    return json.loads(match.group(0))


# =========================
# Source fetching
# =========================

def fetch_rss(source: Dict[str, Any]) -> List[Dict[str, Any]]:
    feed = feedparser.parse(source["url"])
    items: List[Dict[str, Any]] = []
    for entry in getattr(feed, "entries", []):
        title = clean_text(entry.get("title", ""))
        summary = clean_text(entry.get("summary", ""))
        link = entry.get("link", source["url"])
        published = (
            parse_dt(entry.get("published"))
            or parse_dt(entry.get("updated"))
            or parse_dt(entry.get("created"))
        )
        text_blob = f"{title}. {summary}"
        mentions = infer_currency_mentions(text_blob)
        items.append(
            {
                "source": source["name"],
                "source_type": source["type"],
                "title": title,
                "summary": summary,
                "link": link,
                "published_utc": published,
                "tags": source["tags"],
                "mentions": mentions,
            }
        )
    return items


def extract_candidates_from_html(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    candidates = []
    blocks = soup.select("article, li, div, section")

    for block in blocks[:500]:
        a = block.select_one("a[href]")
        if not a:
            continue

        title = clean_text(a.get_text(" ", strip=True))
        if len(title) < 20:
            continue

        href = a.get("href", "")
        if not href:
            continue

        if href.startswith("/"):
            href = requests.compat.urljoin(base_url, href)

        text_blob = clean_text(block.get_text(" ", strip=True))
        summary = text_blob[:400]
        mentions = infer_currency_mentions(f"{title}. {summary}")

        time_tag = block.select_one("time")
        published = parse_dt(time_tag.get("datetime") if time_tag else None)

        candidates.append(
            {
                "source": base_url,
                "source_type": "html",
                "title": title,
                "summary": summary,
                "link": href,
                "published_utc": published,
                "tags": [],
                "mentions": mentions,
            }
        )

    return candidates


def fetch_html(source: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = safe_get(source["url"])
    if response is None:
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    items = extract_candidates_from_html(soup, source["url"])

    for item in items:
        item["source"] = source["name"]
        item["tags"] = source["tags"]

    return items


def fetch_source(source: Dict[str, Any]) -> List[Dict[str, Any]]:
    if source["type"] == "rss":
        return fetch_rss(source)
    if source["type"] == "html":
        return fetch_html(source)
    return []


def collect_news(config: PredictorConfig) -> pd.DataFrame:
    all_articles: List[Dict[str, Any]] = []

    for source in SOURCES:
        batch = fetch_source(source)
        all_articles.extend(batch)
        time.sleep(config.sleep_between_sources)

    news_df = pd.DataFrame(all_articles)
    if news_df.empty:
        return pd.DataFrame(
            columns=[
                "source", "source_type", "title", "summary", "link",
                "published_utc", "tags", "mentions", "hash", "is_recent", "relevance",
            ]
        )

    news_df["published_utc"] = pd.to_datetime(news_df["published_utc"], utc=True, errors="coerce")
    cutoff = pd.Timestamp.utcnow() - pd.Timedelta(days=config.lookback_days)
    news_df["hash"] = news_df.apply(lambda row: article_hash(row["title"], row["link"]), axis=1)
    news_df = news_df.drop_duplicates(subset=["hash"]).copy()
    news_df["is_recent"] = news_df["published_utc"].isna() | (news_df["published_utc"] >= cutoff)
    news_df = news_df[news_df["is_recent"]].copy()

    def relevance_score(row: pd.Series) -> float:
        score = 0.0
        if pd.notna(row["published_utc"]):
            age_hours = (pd.Timestamp.utcnow() - row["published_utc"]).total_seconds() / 3600
            score += max(0.0, 48 - min(age_hours, 48))
        score += 8 * len(row["mentions"] if isinstance(row["mentions"], list) else [])
        score += 3 if "GLOBAL" in (row["tags"] or []) else 0
        return score

    news_df["relevance"] = news_df.apply(relevance_score, axis=1)
    news_df = news_df.sort_values(["relevance", "published_utc"], ascending=[False, False])
    return news_df.reset_index(drop=True)


def assign_articles_to_currency(
    df: pd.DataFrame,
    currency: str,
    max_articles: int,
) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    direct = df[df["mentions"].apply(lambda xs: currency in xs if isinstance(xs, list) else False)].copy()
    tagged = df[df["tags"].apply(lambda xs: currency in xs if isinstance(xs, list) else False)].copy()

    combined = pd.concat([direct, tagged], ignore_index=True)
    if combined.empty:
        return combined

    combined = combined.drop_duplicates(subset=["hash"]).copy()
    combined = combined.sort_values(["relevance", "published_utc"], ascending=[False, False])
    return combined.head(max_articles).reset_index(drop=True)


# =========================
# LLM scoring
# =========================

def build_currency_prompt(currency: str, df: pd.DataFrame) -> str:
    records = []
    for _, row in df.iterrows():
        records.append(
            {
                "source": row.get("source"),
                "published_utc": None if pd.isna(row.get("published_utc")) else row.get("published_utc").isoformat(),
                "title": row.get("title"),
                "summary": row.get("summary"),
                "link": row.get("link"),
            }
        )

    payload = {
        "target_currency": currency,
        "articles": records,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def call_llm_currency_score(
    client: OpenAI,
    currency: str,
    df: pd.DataFrame,
    model: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    if df.empty:
        return {
            "currency": currency,
            "stance": "neutral",
            "score": 0.0,
            "confidence": 0.0,
            "summary": "No relevant recent articles found for this currency.",
            "drivers": [],
            "used_headlines": [],
            "signal": "HOLD",
        }

    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_currency_prompt(currency, df)},
        ],
    )

    raw_text = response.choices[0].message.content
    data = extract_json_object(raw_text)

    data["currency"] = currency
    data["score"] = max(-1.0, min(1.0, float(data.get("score", 0.0))))
    data["confidence"] = max(0.0, min(1.0, float(data.get("confidence", 0.0))))
    data["stance"] = str(data.get("stance", "neutral")).lower().strip()

    if data["stance"] not in {"bullish", "bearish", "neutral"}:
        data["stance"] = "neutral"

    data["summary"] = clean_text(data.get("summary", ""))[:600]

    drivers = data.get("drivers", [])
    if not isinstance(drivers, list):
        drivers = [str(drivers)]
    data["drivers"] = [clean_text(x)[:140] for x in drivers[:8]]

    used = data.get("used_headlines", [])
    if not isinstance(used, list):
        used = [str(used)] if used else []
    data["used_headlines"] = [clean_text(x)[:180] for x in used[:8]]

    if data["score"] >= 0.20:
        data["signal"] = "BUY"
    elif data["score"] <= -0.20:
        data["signal"] = "SELL"
    else:
        data["signal"] = "HOLD"

    return data


def score_currencies(
    news_df: pd.DataFrame,
    config: PredictorConfig,
    client: OpenAI,
) -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []

    for currency in config.currencies:
        basket = assign_articles_to_currency(
            news_df, currency, config.max_articles_per_currency
        )
        try:
            row = call_llm_currency_score(
                client=client,
                currency=currency,
                df=basket,
                model=config.model,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
            )
            row["article_count"] = int(len(basket))
        except Exception as exc:
            row = {
                "currency": currency,
                "stance": "neutral",
                "score": 0.0,
                "confidence": 0.0,
                "summary": f"LLM call failed: {exc}",
                "drivers": [],
                "used_headlines": [],
                "signal": "HOLD",
                "article_count": int(len(basket)),
            }
        rows.append(row)
        time.sleep(config.sleep_between_llm_calls)

    scores_df = pd.DataFrame(rows)
    if scores_df.empty:
        return scores_df

    return scores_df.sort_values(["score", "confidence"], ascending=[False, False]).reset_index(drop=True)


# =========================
# Pair derivation
# =========================

def build_pair_signals(scores_df: pd.DataFrame, currencies: List[str]) -> pd.DataFrame:
    if scores_df.empty:
        return pd.DataFrame(
            columns=[
                "pair", "base", "quote", "base_score", "quote_score",
                "pair_score", "confidence", "signal"
            ]
        )

    score_map = scores_df.set_index("currency")["score"].to_dict()
    conf_map = scores_df.set_index("currency")["confidence"].to_dict()

    pair_rows = []
    for base, quote in itertools.combinations(currencies, 2):
        base_score = float(score_map.get(base, 0.0))
        quote_score = float(score_map.get(quote, 0.0))
        pair_score = base_score - quote_score
        pair_conf = ((float(conf_map.get(base, 0.0)) + float(conf_map.get(quote, 0.0))) / 2.0) * min(1.0, abs(pair_score) + 0.25)

        if pair_score >= 0.20:
            signal = f"BUY {base}/{quote}"
        elif pair_score <= -0.20:
            signal = f"SELL {base}/{quote}"
        else:
            signal = f"HOLD {base}/{quote}"

        pair_rows.append(
            {
                "pair": f"{base}/{quote}",
                "base": base,
                "quote": quote,
                "base_score": round(base_score, 4),
                "quote_score": round(quote_score, 4),
                "pair_score": round(pair_score, 4),
                "confidence": round(pair_conf, 4),
                "signal": signal,
            }
        )

    pairs_df = pd.DataFrame(pair_rows)
    return pairs_df.sort_values(["pair_score", "confidence"], ascending=[False, False]).reset_index(drop=True)


# =========================
# Public API
# =========================

def predict(
    currencies: Optional[List[str]] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    max_articles_per_currency: int = DEFAULT_MAX_ARTICLES_PER_CURRENCY,
    include_pairs: bool = True,
) -> Dict[str, Any]:
    """
    Main function for integration with other agents.

    Returns:
        {
          "timestamp_utc": "...",
          "currency_signals": [
            {
              "currency": "USD",
              "signal": "BUY",
              "stance": "bullish",
              "score": 0.42,
              "confidence": 0.77,
              "summary": "...",
              "drivers": [...],
              "used_headlines": [...],
              "article_count": 6
            },
            ...
          ],
          "pair_signals": [...],   # optional
          "meta": {...}
        }
    """
    config = PredictorConfig(
        currencies=currencies or list(DEFAULT_CURRENCIES),
        lookback_days=lookback_days,
        max_articles_per_currency=max_articles_per_currency,
        model=model or DEFAULT_MODEL,
        base_url=base_url or DEFAULT_BASE_URL,
    )

    client = get_client(api_key=api_key, base_url=config.base_url)
    news_df = collect_news(config)
    scores_df = score_currencies(news_df=news_df, config=config, client=client)
    pairs_df = build_pair_signals(scores_df=scores_df, currencies=config.currencies)

    currency_signals = []
    for row in scores_df.to_dict(orient="records"):
        currency_signals.append(
            {
                "currency": row["currency"],
                "signal": row["signal"],
                "stance": row["stance"],
                "score": round(float(row["score"]), 4),
                "confidence": round(float(row["confidence"]), 4),
                "summary": row["summary"],
                "drivers": row["drivers"],
                "used_headlines": row["used_headlines"],
                "article_count": int(row.get("article_count", 0)),
            }
        )

    result = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "currency_signals": currency_signals,
        "meta": {
            "currencies": config.currencies,
            "lookback_days": config.lookback_days,
            "max_articles_per_currency": config.max_articles_per_currency,
            "model": config.model,
            "news_articles_collected": int(len(news_df)),
        },
    }

    if include_pairs:
        result["pair_signals"] = pairs_df.to_dict(orient="records")

    return result


def predict_as_dataframes(
    currencies: Optional[List[str]] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    max_articles_per_currency: int = DEFAULT_MAX_ARTICLES_PER_CURRENCY,
) -> Dict[str, pd.DataFrame]:
    """
    Helper if you want pandas DataFrames directly.
    """
    result = predict(
        currencies=currencies,
        api_key=api_key,
        base_url=base_url,
        model=model,
        lookback_days=lookback_days,
        max_articles_per_currency=max_articles_per_currency,
        include_pairs=True,
    )

    return {
        "currency_signals": pd.DataFrame(result["currency_signals"]),
        "pair_signals": pd.DataFrame(result["pair_signals"]),
    }


if __name__ == "__main__":
    output = predict()
    print(json.dumps(output, indent=2, ensure_ascii=False))
