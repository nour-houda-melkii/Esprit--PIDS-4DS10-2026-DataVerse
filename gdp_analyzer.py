import pandas as pd


class GDPAnalyzer:
    def __init__(self, column_name: str = "gdp"):
        self.column_name = column_name

    def analyze(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.column_name not in df.columns:
            raise ValueError(f"Column '{self.column_name}' not found in DataFrame.")

        result = df.copy()
        result = result.sort_values("year").reset_index(drop=True)

        result["gdp_change"] = result[self.column_name].diff()

        def compute_score(change):
            if pd.isna(change):
                return 0.0
            if change > 0:
                return 1.0
            if change < 0:
                return -1.0
            return 0.0

        result["gdp_score"] = result["gdp_change"].apply(compute_score)

        return result