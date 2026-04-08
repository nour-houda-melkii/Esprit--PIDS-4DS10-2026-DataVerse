from currency_data_processor import CurrencyDataProcessor
from pair_macro_analyzer import PairMacroAnalyzer


def main():
    file_path = "data/merged_macro_dataset_2000.csv"

    print("=" * 60)
    print("TEST DU MODULE QUANTITATIF")
    print("=" * 60)

    # 🔹 1. Charger les données
    processor = CurrencyDataProcessor(file_path)
    df = processor.load_data()

    print("\n1️⃣ Aperçu des données :")
    print(df.head())

    print("\n2️⃣ Devises disponibles :")
    currencies = processor.get_available_currencies()
    print(currencies)

    # 🔹 2. Tester une paire
    base = "EUR"
    quote = "USD"

    print(f"\n3️⃣ Analyse de la paire {base}/{quote} :")

    analyzer = PairMacroAnalyzer(file_path)

    pair_df = analyzer.analyze_pair(base, quote)

    print("\n📊 Dernières lignes du résultat :")
    print(pair_df.tail())

    # 🔹 3. Dernier signal
    latest = pair_df.iloc[-1]

    print("\n4️⃣ Dernier signal :")
    print({
        "year": int(latest["year"]),
        "pair": latest["pair"],
        "pair_score": float(latest["pair_score"]),
        "signal": latest["signal"]
    })

    # 🔹 4. Résumé
    print("\n5️⃣ Résumé final :")
    print(
        f"➡️ En {int(latest['year'])}, "
        f"le score de la paire {latest['pair']} est {latest['pair_score']:.2f} "
        f"→ signal : {latest['signal']}"
    )

    print("\n" + "=" * 60)
    print("TEST TERMINÉ ✅")
    print("=" * 60)


if __name__ == "__main__":
    main()


    