import pandas as pd

from currency_data_processor import CurrencyDataProcessor
from gdp_analyzer import GDPAnalyzer
from inflation_analyzer import InflationAnalyzer
from unemployment_analyzer import UnemploymentAnalyzer
from interest_rate_analyzer import InterestRateAnalyzer
from currency_macro_scorer import CurrencyMacroScorer


class PairMacroAnalyzer:
    def __init__(self, file_path: str):
        self.processor = CurrencyDataProcessor(file_path)

        self.gdp = GDPAnalyzer()
        self.inflation = InflationAnalyzer()
        self.unemployment = UnemploymentAnalyzer()
        self.rate = InterestRateAnalyzer()
        self.scorer = CurrencyMacroScorer()

    def build_currency_score(self, currency: str):
        df = self.processor.get_currency_data(currency)

        df = self.gdp.analyze(df)
        df = self.inflation.analyze(df)
        df = self.unemployment.analyze(df)
        df = self.rate.analyze(df)
        df = self.scorer.compute(df)

        return df

    def analyze_pair(self, base: str, quote: str):
        base_df = self.build_currency_score(base)
        quote_df = self.build_currency_score(quote)

        merged = pd.merge(
            base_df[["year", "currency_macro_score"]],
            quote_df[["year", "currency_macro_score"]],
            on="year",
            suffixes=("_base", "_quote")
        )

        merged["pair"] = f"{base}/{quote}"

        merged["pair_score"] = (
            merged["currency_macro_score_base"] -
            merged["currency_macro_score_quote"]
        )

        def signal(score):
            if score > 0:
                return f"BUY {base}/{quote}"
            elif score < 0:
                return f"SELL {base}/{quote}"
            return "NEUTRAL"

        merged["signal"] = merged["pair_score"].apply(signal)

        return merged