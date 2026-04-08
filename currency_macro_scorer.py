import pandas as pd


class CurrencyMacroScorer:
    def __init__(
        self,
        gdp_weight: float = 0.25,
        inflation_weight: float = 0.25,
        unemployment_weight: float = 0.25,
        interest_rate_weight: float = 0.25,
    ):
        self.gdp_weight = gdp_weight
        self.inflation_weight = inflation_weight
        self.unemployment_weight = unemployment_weight
        self.interest_rate_weight = interest_rate_weight

    def compute(self, df: pd.DataFrame) -> pd.DataFrame:
        required_columns = [
            "gdp_score",
            "inflation_score",
            "unemployment_score",
            "interest_rate_score",
        ]

        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Column '{col}' not found in DataFrame.")

        result = df.copy()
        result = result.sort_values("year").reset_index(drop=True)

        result["currency_macro_score"] = (
            self.gdp_weight * result["gdp_score"]
            + self.inflation_weight * result["inflation_score"]
            + self.unemployment_weight * result["unemployment_score"]
            + self.interest_rate_weight * result["interest_rate_score"]
        )

        return result