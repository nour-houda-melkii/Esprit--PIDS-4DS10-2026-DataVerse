from central_brain import CentralBrain
import json

pairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "EURJPY", "GBPJPY"]

brain = CentralBrain()

results = {}

for p in pairs:
    try:
        r = brain.predict(pair=p, use_llm=False)
        results[p] = {
            "signal": r["final_signal"],
            "confidence": r["final_confidence"]
        }
    except Exception as e:
        results[p] = {"error": str(e)}

with open("latest_signal.json", "w") as f:
    json.dump(results, f, indent=2)

print("✅ Signals updated")