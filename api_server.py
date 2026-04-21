from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from central_brain import CentralBrain
import os
import json

# ─────────────────────────────────────────────
# INIT APP
# ─────────────────────────────────────────────
app = FastAPI(
    title="FX AlphaLab API",
    description="Central Brain FX Prediction API",
    version="1.0"
)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# GLOBAL BRAIN (LAZY LOAD)
# ─────────────────────────────────────────────
brain = None

def get_brain():
    global brain
    if brain is None:
        print("🚀 Loading Central Brain...")
        brain = CentralBrain(
            llama_api_key=os.environ.get("LLM_API_KEY", "")
        )
        print("✅ Brain loaded")
    return brain


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "FX AlphaLab API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/signals")
def get_signals():
    try:
        path = os.path.join(os.getcwd(), "latest_signal.json")
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}


@app.get("/predict_all")
def predict_all(use_llm: bool = False):
    brain = get_brain()

    pairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "EURJPY", "GBPJPY"]
    results = {}

    for p in pairs:
        try:
            r = brain.predict(pair=p, use_llm=use_llm)
            results[p] = {
                "signal": r["final_signal"],
                "confidence": r["final_confidence"]
            }
        except Exception as e:
            results[p] = {"error": str(e)}

    return {
        "success": True,
        "data": results
    }


@app.get("/predict")
def predict(
    pair: str = Query("EURUSD"),
    text: str = Query(None),
    use_llm: bool = Query(True)
):
    brain = get_brain()

    try:
        result = brain.predict(
            pair=pair,
            manual_text=text,
            use_llm=use_llm
        )

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }