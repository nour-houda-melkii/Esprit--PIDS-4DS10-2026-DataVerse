import pandas as pd


class CurrencyDataProcessor:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load_data(self) -> pd.DataFrame:
        df = pd.read_csv(self.file_path)

        required_columns = [
            "year",
            "currency",
            "gdp",
            "inflation",
            "unemployment",
            "interest_rate",
        ]

        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(
                f"Missing required columns in dataset: {missing_columns}"
            )

        df["year"] = pd.to_numeric(df["year"], errors="coerce")
        df["currency"] = df["currency"].astype(str).str.upper().str.strip()

        numeric_columns = ["gdp", "inflation", "unemployment", "interest_rate"]
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        df = df.dropna(subset=["year", "currency"])
        df = df.sort_values(["currency", "year"]).reset_index(drop=True)

        return df

    def get_currency_data(self, currency: str) -> pd.DataFrame:
        df = self.load_data()
        currency = currency.upper().strip()

        currency_df = df[df["currency"] == currency].copy()

        if currency_df.empty:
            raise ValueError(f"No data found for currency '{currency}'.")

        currency_df = currency_df.sort_values("year").reset_index(drop=True)

        return currency_df

    def get_available_currencies(self) -> list:
        df = self.load_data()
        return sorted(df["currency"].dropna().unique().tolist())