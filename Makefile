# ============================================================
#  FX-ALPHALAB — Makefile  v6  (Windows — requires GNU Make)
#  Install make:  choco install make -y
#
#  API KEY SETUP (one-time, run once in PowerShell as Admin):
#    [System.Environment]::SetEnvironmentVariable("TOKENFACTORY_KEY","your_key","Machine")
#  Or for current user only:
#    [System.Environment]::SetEnvironmentVariable("TOKENFACTORY_KEY","your_key","User")
#  Then close and reopen your terminal.
#
#  File layout expected:
#    Integration/
#    ├── central_brain.py
#    ├── predict_sentiment.py
#    ├── predict_correlation.py
#    ├── predict_geopolitical.py
#    ├── predict_technical.py
#    ├── predict_macro.py
#    ├── fx_macro_signal_predictor.py   <- rename from script.py
#    ├── check_geo.py
#    ├── data/
#    │   └── processed/
#    │       └── fx_geopolitical_features.csv
#    ├── clean_multi_tf/              <- EURUSD_H1_clean.csv, ...
#    ├── models/
#    │   ├── sentiment_agent/         <- model_lr.pkl, model_lgb.pkl, ...
#    │   ├── correlation_agent/       <- xgb_corr_EURUSD.pkl, ...
#    │   ├── geopolitical_agent/      <- Model_A/B/C_{PAIR}.keras, scaler_{PAIR}.pkl
#    │   ├── technical_agent/         <- EURUSD_H1.pkl, EURUSD_D1.pkl, ...
#    │   └── meta_model.pkl           <- optional, built with: make train
#    └── Makefile
# ============================================================

PYTHON    = python
PIP       = python -m pip
PAIR     ?= EURUSD
TEXT     ?=
TORCH_URL = https://download.pytorch.org/whl/cpu
DATA_PATH ?= data/processed/fx_geopolitical_features.csv

# API key: reads from environment, never hardcoded
KEY      ?= $(TOKENFACTORY_KEY)

# Pair groups
ALL_PAIRS = EURUSD GBPUSD USDJPY USDCHF EURJPY
GEO_PAIRS = EURUSD GBPUSD USDJPY USDCHF

.DEFAULT_GOAL := help

# ── help ──────────────────────────────────────────────────────────────────────
help:
	@echo.
	@echo  FX-ALPHALAB -- CENTRAL BRAIN v6
	@echo  ============================================================
	@echo  SETUP (run once):
	@echo    make set-key KEY=your_tokenfactory_key   Set API key permanently
	@echo    make install                             Install all dependencies
	@echo    make check                               Verify all imports
	@echo    make check-key                           Verify API key is set
	@echo    make check-geo                           Verify geo data + models
	@echo    make rename-macro                        Rename script.py to fx_macro...py
	@echo.
	@echo  RUNNING (full brain -- all 5 agents):
	@echo    make run         PAIR=EURUSD             Single pair
	@echo    make run-all                             All pairs sequentially
	@echo    make run-nollm   PAIR=EURUSD             Single pair, no LLaMA
	@echo    make run-all-nollm                       All pairs, no LLaMA (faster)
	@echo    make run-text    PAIR=EURUSD TEXT="..."  Manual headline text
	@echo    make train                               Retrain meta-model (15-d)
	@echo.
	@echo  RUNNING (individual agents -- for testing):
	@echo    make run-sentiment       PAIR=EURUSD     Sentiment agent only
	@echo    make run-sentiment-text  PAIR=EURUSD TEXT="..."
	@echo    make run-correlation     PAIR=EURUSD     Correlation agent only
	@echo    make run-correlation-nomarkov PAIR=EURUSD
	@echo    make run-geo             PAIR=EURUSD     Geopolitical agent only
	@echo    make run-geo-all                         Geo agent, all 4 pairs
	@echo    make run-technical       PAIR=EURUSD     Technical agent only
	@echo    make run-technical-noapi PAIR=EURUSD     Technical (CSV cache only)
	@echo    make run-technical-all                   Technical, all pairs
	@echo    make run-macro           PAIR=EURUSD     Macro agent only
	@echo    make run-macro-all                       Macro agent, all pairs
	@echo    make monitor                             Show sentiment monitor
	@echo.
	@echo  MAINTENANCE:
	@echo    make fix-pip                             Repair broken pip
	@echo    make fix-scipy                           Fix corrupted scipy
	@echo    make fix-tf                              Fix TensorFlow install
	@echo    make clean                               Remove cache files
	@echo  ============================================================
	@echo.

# ── set-key ───────────────────────────────────────────────────────────────────
set-key:
	@echo [set-key] Saving TOKENFACTORY_KEY to Windows User environment...
	powershell -Command "[System.Environment]::SetEnvironmentVariable('TOKENFACTORY_KEY','$(KEY)','User')"
	@echo [set-key] Done. Close and reopen your terminal for it to take effect.
	@echo [set-key] Then run: make check-key

check-key:
	@echo [check-key] Reading TOKENFACTORY_KEY from environment...
	@powershell -Command "if ($$env:TOKENFACTORY_KEY) { Write-Host '  [OK] Key found: ' + $$env:TOKENFACTORY_KEY.Substring(0,6) + '...' } else { Write-Host '  [MISSING] TOKENFACTORY_KEY not set. Run: make set-key KEY=your_key' }"

# ── rename-macro ──────────────────────────────────────────────────────────────
rename-macro:
	@echo [rename-macro] Renaming script.py to fx_macro_signal_predictor.py ...
	-rename script.py fx_macro_signal_predictor.py 2>nul
	@echo [rename-macro] Done.

# ── install ───────────────────────────────────────────────────────────────────
install: fix-pip
	@echo [1/9] Upgrading build tools...
	$(PIP) install --upgrade setuptools wheel
	@echo [2/9] Installing PyTorch CPU (sentiment agent)...
	$(PIP) install torch torchvision torchaudio --index-url $(TORCH_URL)
	@echo [3/9] Re-pinning setuptools after torch...
	$(PIP) install --upgrade setuptools
	@echo [4/9] Installing scipy (force-reinstall)...
	$(PIP) install --force-reinstall scipy
	@echo [5/9] Installing core ML libraries...
	$(PIP) install numpy pandas scikit-learn xgboost lightgbm joblib
	@echo [6/9] Installing TensorFlow CPU (geopolitical agent -- Python 3.13 compatible)...
	$(PIP) install "tensorflow-cpu>=2.20.0"
	@echo [7/9] Installing NLP, data and web libraries...
	$(PIP) install transformers safetensors feedparser yfinance openai statsmodels ta requests colorama tqdm python-dotenv
	@echo [8/9] Installing macro agent dependencies...
	$(PIP) install beautifulsoup4 python-dateutil
	@echo [9/9] Done.
	@echo.
	@echo  ============================================================
	@echo  Installation complete. Run: make check
	@echo  Then rename script.py:    make rename-macro
	@echo  ============================================================

# ── fix-pip ───────────────────────────────────────────────────────────────────
fix-pip:
	@echo [fix-pip] Repairing pip...
	curl -k https://bootstrap.pypa.io/get-pip.py -o get-pip.py
	$(PYTHON) get-pip.py --force-reinstall
	@echo [fix-pip] Done.

# ── fix-scipy ─────────────────────────────────────────────────────────────────
fix-scipy:
	@echo [fix-scipy] Re-pinning setuptools then reinstalling scipy...
	$(PIP) install --upgrade setuptools
	$(PIP) install --force-reinstall scipy
	@echo [fix-scipy] Done.

# ── fix-tf ────────────────────────────────────────────────────────────────────
fix-tf:
	@echo [fix-tf] Reinstalling TensorFlow CPU for Python 3.13...
	$(PIP) install --force-reinstall "tensorflow-cpu>=2.20.0"
	@$(PYTHON) -c "import tensorflow as tf; print('  [OK] tensorflow', tf.__version__)"
	@echo [fix-tf] Done.

# ── check ─────────────────────────────────────────────────────────────────────
check:
	@echo [check] Verifying Python environment...
	@$(PYTHON) -c "import sys;                                    print('  python         ', sys.version.split()[0])"
	@$(PYTHON) -c "import torch;                                  print('  torch          ', torch.__version__)"
	@$(PYTHON) -c "import numpy;                                  print('  numpy          ', numpy.__version__)"
	@$(PYTHON) -c "import pandas;                                 print('  pandas         ', pandas.__version__)"
	@$(PYTHON) -c "import sklearn;                                print('  scikit-learn   ', sklearn.__version__)"
	@$(PYTHON) -c "import scipy;                                  print('  scipy          ', scipy.__version__)"
	@$(PYTHON) -c "import xgboost;                                print('  xgboost        ', xgboost.__version__)"
	@$(PYTHON) -c "import lightgbm;                               print('  lightgbm       ', lightgbm.__version__)"
	@$(PYTHON) -c "import transformers;                           print('  transformers   ', transformers.__version__)"
	@$(PYTHON) -c "import tensorflow;                             print('  tensorflow     ', tensorflow.__version__)"
	@$(PYTHON) -c "import yfinance;                               print('  yfinance       ', yfinance.__version__)"
	@$(PYTHON) -c "import feedparser;                             print('  feedparser     ', feedparser.__version__)"
	@$(PYTHON) -c "import openai;                                 print('  openai         ', openai.__version__)"
	@$(PYTHON) -c "import statsmodels;                            print('  statsmodels    ', statsmodels.__version__)"
	@$(PYTHON) -c "import colorama;                               print('  colorama       ', colorama.__version__)"
	@$(PYTHON) -c "import joblib;                                 print('  joblib         ', joblib.__version__)"
	@$(PYTHON) -c "import bs4;                                    print('  beautifulsoup4 ', bs4.__version__)"
	@$(PYTHON) -c "import dateutil;                               print('  python-dateutil', dateutil.__version__)"
	@$(PYTHON) -c "import importlib.metadata;                     print('  ta             ', importlib.metadata.version('ta'))"
	@echo.
	@echo  [check] All imports OK.
	@echo  Run: make check-key    to verify your API key is set.
	@echo  Run: make check-geo    to verify geopolitical data and models.
	@echo  Run: make rename-macro to rename script.py if not done yet.

# ── check-geo ─────────────────────────────────────────────────────────────────
check-geo:
	@echo [check-geo] Checking geopolitical data and models...
	$(PYTHON) check_geo.py "$(DATA_PATH)"

# ── CENTRAL BRAIN (full -- all 5 agents) ──────────────────────────────────────
run:
	$(PYTHON) central_brain.py --pair $(PAIR) --key $(KEY)

run-nollm:
	$(PYTHON) central_brain.py --pair $(PAIR) --no-llm

run-text:
	$(PYTHON) central_brain.py --pair $(PAIR) --text "$(TEXT)" --key $(KEY)

run-all:
	@echo.
	@echo  ============================================================
	@echo  FX-ALPHALAB -- Running all pairs: $(ALL_PAIRS)
	@echo  ============================================================
	@echo.
	@for %%P in ($(ALL_PAIRS)) do ( \
		echo. & \
		echo  -- %%P ---------------------------------------- & \
		$(PYTHON) central_brain.py --pair %%P --key $(KEY) \
	)
	@echo.
	@echo  ============================================================
	@echo  All pairs complete. Results in latest_signal.json
	@echo  Full log: central_brain.log
	@echo  ============================================================

run-all-nollm:
	@echo.
	@echo  ============================================================
	@echo  FX-ALPHALAB -- Running all pairs (no LLM): $(ALL_PAIRS)
	@echo  ============================================================
	@echo.
	@for %%P in ($(ALL_PAIRS)) do ( \
		echo. & \
		echo  -- %%P ---------------------------------------- & \
		$(PYTHON) central_brain.py --pair %%P --no-llm \
	)
	@echo.
	@echo  ============================================================
	@echo  All pairs complete. Log: central_brain.log
	@echo  ============================================================

# ── INDIVIDUAL AGENTS (for testing / development) ─────────────────────────────
run-sentiment:
	$(PYTHON) predict_sentiment.py --pair $(PAIR)

run-sentiment-text:
	$(PYTHON) predict_sentiment.py --pair $(PAIR) --text "$(TEXT)"

run-correlation:
	$(PYTHON) predict_correlation.py --pair $(PAIR)

run-correlation-nomarkov:
	$(PYTHON) predict_correlation.py --pair $(PAIR) --no-markov

run-geo:
	$(PYTHON) predict_geopolitical.py --pair $(PAIR)

run-geo-all:
	@echo.
	@echo  ============================================================
	@echo  FX-ALPHALAB -- Geopolitical agent, all pairs: $(GEO_PAIRS)
	@echo  ============================================================
	@echo.
	@for %%P in ($(GEO_PAIRS)) do ( \
		echo. & \
		echo  -- %%P ---------------------------------------- & \
		$(PYTHON) predict_geopolitical.py --pair %%P \
	)
	@echo.
	@echo  Done. Log: geopolitical.log

run-geo-data:
	$(PYTHON) predict_geopolitical.py --pair $(PAIR) --data $(DATA_PATH)

# ── TECHNICAL AGENT ───────────────────────────────────────────────────────────
run-technical:
	$(PYTHON) predict_technical.py --pair $(PAIR)

run-technical-noapi:
	$(PYTHON) predict_technical.py --pair $(PAIR) --no-api

run-technical-all:
	@echo.
	@echo  ============================================================
	@echo  FX-ALPHALAB -- Technical agent, all pairs: $(ALL_PAIRS)
	@echo  ============================================================
	@echo.
	@for %%P in ($(ALL_PAIRS)) do ( \
		echo. & \
		echo  -- %%P ---------------------------------------- & \
		$(PYTHON) predict_technical.py --pair %%P \
	)
	@echo.
	@echo  Done. Log: technical.log

# ── MACRO AGENT ───────────────────────────────────────────────────────────────
run-macro:
	$(PYTHON) predict_macro.py --pair $(PAIR) --key $(KEY)

run-macro-all:
	@echo.
	@echo  ============================================================
	@echo  FX-ALPHALAB -- Macro agent, all pairs: $(ALL_PAIRS)
	@echo  ============================================================
	@echo.
	@for %%P in ($(ALL_PAIRS)) do ( \
		echo. & \
		echo  -- %%P ---------------------------------------- & \
		$(PYTHON) predict_macro.py --pair %%P --key $(KEY) \
	)
	@echo.
	@echo  Done. Log: macro.log
	@echo  NOTE: Macro agent caches results for 30 min -- all pairs share one LLM run.

monitor:
	$(PYTHON) predict_sentiment.py --monitor

monitor-tail:
	$(PYTHON) predict_sentiment.py --monitor --tail

# ── META-MODEL ────────────────────────────────────────────────────────────────
train:
	@echo [train] Retraining 15-d meta-model from history.json ...
	$(PYTHON) central_brain.py --train
	@echo [train] Done. Old model archived to models/meta_model_v5.pkl

# ── clean ─────────────────────────────────────────────────────────────────────
clean:
	@echo [clean] Removing temp files...
	-del /q get-pip.py 2>nul
	-del /q fix_log.txt 2>nul
	-del /q *.pyc 2>nul
	-for /r %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" 2>nul
	@echo [clean] Done.