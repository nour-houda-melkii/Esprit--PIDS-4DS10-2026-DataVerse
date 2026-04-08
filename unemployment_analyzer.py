import pandas as pd


class UnemploymentAnalyzer:
    def __init__(self, column_name: str = "unemployment"):
        self.column_name = column_name

    def analyze(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.column_name not in df.columns:
            raise ValueError(f"Column '{self.column_name}' not found in DataFrame.")

        result = df.copy()
        result = result.sort_values("year").reset_index(drop=True)

        result["unemployment_change"] = result[self.column_name].diff()

        def compute_score(change):
            if pd.isna(change):
                return 0.0
            if change < 0:
                return 1.0
            if change > 0:
                return -1.0
            return 0.0

        result["unemployment_score"] = result["unemployment_change"].apply(compute_score)

        return result