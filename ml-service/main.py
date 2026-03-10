"""
SponsorWise ML Service — v3.0.0
FastAPI two-stage XGBoost pipeline for event sponsorship prediction.

Changes from v2:
  - CORS: uses ALLOWED_ORIGINS env var (no wildcard + credentials conflict)
  - EVENT_LOOKUP: keys pre-normalized to fix hyphen-matching bug
  - brand_annual_budget: explicit optional input (no sponsor_amount inflation)
  - Attendance clamping: smooth fill-factor, no discontinuity at 1.4x
  - Groq calls: reduced from 3 to 2 per /predict request
  - Logging: structured Python logging replaces all print() calls
  - Single _groq_chat() helper centralizes all LLM calls
  - Lifespan context manager replaces deprecated @app.on_event
  - Request ID + timing middleware for observability
  - API key authentication on protected routes
  - Cold email: written FROM sponsor TO organizer, zero ML data exposed
  - DEV_MODE env var bug fixed
  - Groq call timeout added
"""

import logging
import os
import sys
import json
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field, model_validator

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("sponsorwise")

# ─────────────────────────────────────────────────────────────
# NumPy pickle compatibility shim
# ─────────────────────────────────────────────────────────────
try:
    _np_core = getattr(np, "_core", None) or getattr(np, "core", None)
    if _np_core is not None:
        sys.modules.setdefault("numpy._core", _np_core)
        _ma = getattr(_np_core, "multiarray", None)
        if _ma is not None:
            sys.modules.setdefault("numpy._core.multiarray", _ma)
        _um = getattr(_np_core, "_multiarray_umath", None)
        if _um is not None:
            sys.modules.setdefault("numpy._core._multiarray_umath", _um)
    logger.info("NumPy compatibility shim applied.")
except Exception as _shim_exc:
    logger.warning(f"NumPy shim skipped: {_shim_exc}")

# ─────────────────────────────────────────────────────────────
# Environment
# ─────────────────────────────────────────────────────────────
_current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_current_dir, ".env"))

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Comma-separated origins in .env:
# ALLOWED_ORIGINS=http://localhost:3000,https://myapp.com
# Never combine allow_origins=["*"] with allow_credentials=True.
ALLOWED_ORIGINS: List[str] = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")
    if o.strip()
]

# ─────────────────────────────────────────────────────────────
# API Key Authentication
# ─────────────────────────────────────────────────────────────
SERVICE_API_KEY: str = os.getenv("SERVICE_API_KEY", "")

_api_key_header = APIKeyHeader(
    name="X-API-Key",
    description="Pass your SponsorWise API key in the X-API-Key header.",
    auto_error=False,
)


def require_api_key(key: str = Security(_api_key_header)) -> str:
    """
    Dependency that validates X-API-Key on protected routes.

    - If SERVICE_API_KEY is not set in .env, auth is skipped (local dev).
    - If it IS set, every request must supply the matching key.
    """
    if not SERVICE_API_KEY:
        logger.warning("SERVICE_API_KEY not set — running without authentication.")
        return "no-auth"
    if key != SERVICE_API_KEY:
        logger.warning("Rejected request — invalid or missing API key.")
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing API key. Pass it in the X-API-Key header.",
        )
    return key


# ─────────────────────────────────────────────────────────────
# Groq client (optional)
# ─────────────────────────────────────────────────────────────
try:
    from groq import Groq as _Groq  # type: ignore
    _groq_available = True
except ImportError:
    _Groq = None
    _groq_available = False

groq_client: Optional[Any] = None


def _init_groq() -> Optional[Any]:
    if not _groq_available:
        logger.warning("groq package not installed — AI features disabled.")
        return None
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — AI features disabled.")
        return None
    try:
        c = _Groq(api_key=GROQ_API_KEY)
        logger.info("Groq client initialized.")
        return c
    except Exception as exc:
        logger.error(f"Groq client init failed: {exc}")
        return None


# ─────────────────────────────────────────────────────────────
# ML Artifacts
# ─────────────────────────────────────────────────────────────
scaler = attendance_model = sponsor_model = None
EXPECTED_COLUMNS: List[str] = []
REQUIRED_FEATURE_COUNT = 67


def _load_artifacts() -> bool:
    global scaler, attendance_model, sponsor_model, EXPECTED_COLUMNS
    try:
        scaler           = joblib.load(os.path.join(_current_dir, "feature_scaler.pkl"))
        attendance_model = joblib.load(os.path.join(_current_dir, "stage1_attendance_xgboost.pkl"))
        sponsor_model    = joblib.load(os.path.join(_current_dir, "stage2_sponsor_xgboost.pkl"))
        EXPECTED_COLUMNS = list(getattr(scaler, "feature_names_in_", []))
        if len(EXPECTED_COLUMNS) != REQUIRED_FEATURE_COUNT:
            raise ValueError(
                f"Scaler has {len(EXPECTED_COLUMNS)} features; "
                f"expected {REQUIRED_FEATURE_COUNT}."
            )
        logger.info(f"ML artifacts loaded ({REQUIRED_FEATURE_COUNT} features).")
        return True
    except Exception as exc:
        logger.error(f"ML artifact loading failed: {exc}")
        scaler = attendance_model = sponsor_model = None
        EXPECTED_COLUMNS = []
        return False


def _models_ready() -> bool:
    return all(m is not None for m in (scaler, attendance_model, sponsor_model))


# ─────────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global groq_client
    logger.info("SponsorWise ML Service starting...")
    _load_artifacts()
    groq_client = _init_groq()
    logger.info(
        f"Startup complete | models_ready={_models_ready()} "
        f"| groq_enabled={groq_client is not None} "
        f"| auth_enabled={bool(SERVICE_API_KEY)}"
    )
    yield
    logger.info("SponsorWise ML Service shut down.")


# ─────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="SponsorWise ML Service",
    version="3.0.0",
    description=(
        "Two-stage XGBoost pipeline for event sponsorship prediction "
        "with agentic AI insights."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next) -> Response:
    """Injects a short request ID into every response and logs latency."""
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    request.state.request_id = request_id
    response: Response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"]       = request_id
    response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
    logger.info(
        f"[{request_id}] {request.method} {request.url.path} "
        f"→ {response.status_code} ({elapsed_ms} ms)"
    )
    return response


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────
# Monthly weather defaults for Madhya Pradesh (temp °C, humidity %, is_raining)
MP_WEATHER_DEFAULTS: Dict[int, Tuple[int, int, int]] = {
    1:  (17, 55, 0), 2:  (20, 45, 0), 3:  (26, 32, 0),
    4:  (32, 25, 0), 5:  (36, 28, 0), 6:  (34, 58, 1),
    7:  (28, 82, 1), 8:  (27, 85, 1), 9:  (28, 78, 0),
    10: (27, 58, 0), 11: (22, 52, 0), 12: (18, 55, 0),
}
FESTIVE_MONTHS: frozenset = frozenset({1, 2, 3, 4, 8, 9, 10, 11, 12})

CITIES_POP: Dict[str, float] = {
    "Indore": 35.0,  "Bhopal": 28.0,       "Jabalpur": 16.0,  "Gwalior": 12.0,
    "Ujjain": 6.5,   "Sagar": 4.0,          "Dewas": 3.5,      "Satna": 3.5,
    "Rewa": 2.8,     "Ratlam": 3.0,         "Katni": 2.5,      "Chhindwara": 2.0,
    "Khandwa": 2.5,  "Burhanpur": 2.2,      "Morena": 2.5,     "Singrauli": 2.8,
    "Vidisha": 2.0,  "Narmadapuram": 1.8,   "Shivpuri": 1.8,   "Damoh": 1.5,
    "Sehore": 1.5,   "Seoni": 1.3,          "Neemuch": 1.3,    "Mandsaur": 1.5,
    "Khargone": 1.8,
}

# Category benchmark budgets — used ONLY when brand_annual_budget is not supplied
BRAND_BUDGET_DEFAULTS: Dict[str, int] = {
    "Automobile":           40_00_000,
    "Telecom":              38_00_000,
    "Real Estate":          30_00_000,
    "FMCG":                 22_00_000,
    "Beverage":             20_00_000,
    "Fintech":              18_00_000,
    "Edtech":               14_00_000,
    "Apparel":              12_00_000,
    "Beauty/Personal Care": 10_00_000,
    "Local Retail":          6_00_000,
}

BRAND_AFFINITIES: Dict[str, Dict[str, List[str]]] = {
    "FMCG": {
        "aud": ["mass", "family"],
        "aff": ["Food Festival", "Cricket Screening", "Religious/Cultural", "College Fest"],
    },
    "Beverage": {
        "aud": ["mass", "youth", "family"],
        "aff": ["Music Concert", "Food Festival", "Cricket Screening", "College Fest", "Sports Tournament"],
    },
    "Fintech": {
        "aud": ["youth", "professional"],
        "aff": ["Tech Meetup", "Business Conference", "College Fest"],
    },
    "Edtech": {
        "aud": ["youth"],
        "aff": ["Tech Meetup", "College Fest"],
    },
    "Automobile": {
        "aud": ["mass", "professional"],
        "aff": ["Sports Tournament", "Cricket Screening", "Business Conference", "Music Concert"],
    },
    "Telecom": {
        "aud": ["mass", "youth"],
        "aff": ["Music Concert", "Cricket Screening", "College Fest", "Food Festival", "Religious/Cultural"],
    },
    "Apparel": {
        "aud": ["youth", "family"],
        "aff": ["Music Concert", "College Fest", "Standup Comedy", "Food Festival"],
    },
    "Beauty/Personal Care": {
        "aud": ["youth", "family"],
        "aff": ["Music Concert", "College Fest", "Food Festival"],
    },
    "Local Retail": {
        "aud": ["mass", "family"],
        "aff": ["Religious/Cultural", "Food Festival", "Sports Tournament", "Cricket Screening"],
    },
    "Real Estate": {
        "aud": ["professional", "family"],
        "aff": ["Business Conference", "Cricket Screening", "Religious/Cultural"],
    },
}

EVENT_TAGS: Dict[str, List[str]] = {
    "Music Concert":       ["youth", "family"],
    "Food Festival":       ["family", "mass"],
    "Religious/Cultural":  ["family", "mass"],
    "Cricket Screening":   ["mass", "youth"],
    "Standup Comedy":      ["youth"],
    "Tech Meetup":         ["youth", "professional"],
    "College Fest":        ["youth"],
    "Sports Tournament":   ["youth", "mass"],
    "Business Conference": ["professional"],
}


# ─────────────────────────────────────────────────────────────
# Normalization & canonical lookup
# ─────────────────────────────────────────────────────────────
def _norm(s: str) -> str:
    """Lowercase and collapse all non-alphanumeric chars to spaces."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _build_lookup(raw: Dict[str, str]) -> Dict[str, str]:
    """
    Pre-normalize every key at import time.

    Fixes the original bug: keys like 'stand-up comedy' were never matched
    because _norm() converts hyphens to spaces before the dict lookup.
    Pre-normalizing the keys removes the mismatch entirely.
    """
    return {_norm(k): v for k, v in raw.items()}


EVENT_LOOKUP: Dict[str, str] = _build_lookup({
    "stand-up comedy":     "Standup Comedy",
    "standup comedy":      "Standup Comedy",
    "stand up comedy":     "Standup Comedy",
    "religious/cultural":  "Religious/Cultural",
    "religious cultural":  "Religious/Cultural",
    "tech meet-up":        "Tech Meetup",
    "tech meetup":         "Tech Meetup",
    "tech meet up":        "Tech Meetup",
    "college fest":        "College Fest",
    "music concert":       "Music Concert",
    "food festival":       "Food Festival",
    "cricket screening":   "Cricket Screening",
    "sports tournament":   "Sports Tournament",
    "business conference": "Business Conference",
})

BRAND_LOOKUP: Dict[str, str] = _build_lookup({
    "beauty":               "Beauty/Personal Care",
    "beauty/personal care": "Beauty/Personal Care",
    "personal care":        "Beauty/Personal Care",
    "fmcg":                 "FMCG",
    "telecom":              "Telecom",
    "real estate":          "Real Estate",
    "beverage":             "Beverage",
    "fintech":              "Fintech",
    "edtech":               "Edtech",
    "apparel":              "Apparel",
    "local retail":         "Local Retail",
    "automobile":           "Automobile",
})


def canonical_city(s: str) -> str:
    norm_input = _norm(s or "")
    for city in CITIES_POP:
        if _norm(city) == norm_input:
            return city
    return (s or "").strip()


def canonical_event_type(s: str) -> str:
    return EVENT_LOOKUP.get(_norm(s or ""), (s or "").strip())


def canonical_brand_category(s: str) -> str:
    return BRAND_LOOKUP.get(_norm(s or ""), (s or "").strip())


# ─────────────────────────────────────────────────────────────
# Domain / ML logic
# ─────────────────────────────────────────────────────────────
def competition_expected(city: str, is_weekend: int, is_festive: int) -> int:
    """Estimate number of competing events using city population and date context."""
    pop = float(CITIES_POP.get(city, 10.0))
    lam = 0.8 + 0.08 * pop
    if is_weekend:
        lam *= 1.6
    if is_festive:
        lam *= 1.4
    return int(np.clip(round(lam), 0, 25))


def compute_fit_score(brand_cat: str, event_type: str) -> float:
    """Math-based fit score. Used as fallback when AI synergy is unavailable."""
    bc        = BRAND_AFFINITIES.get(brand_cat, {"aud": ["mass"], "aff": []})
    tags      = EVENT_TAGS.get(event_type, ["mass"])
    type_match = 1.0 if event_type in bc["aff"] else 0.55
    overlap   = min(len(set(bc["aud"]).intersection(set(tags))), 2)
    aud_score = {0: 0.50, 1: 0.82, 2: 1.05}[overlap]
    return float(np.clip(type_match * aud_score * 0.95, 0.25, 1.60))


def fit_to_synergy(fit_score: float) -> int:
    """Convert internal fit decimal [0.55–1.25] to UI synergy percentage [0–100]."""
    lo, hi = 0.55, 1.25
    return int(np.clip((fit_score - lo) / (hi - lo) * 100, 0, 100))


def synergy_to_fit(synergy_score: int) -> float:
    """Reverse-scale AI synergy [0–100] back to ML fit decimal [0.55–1.25]."""
    lo, hi = 0.55, 1.25
    return float(np.clip((synergy_score / 100.0) * (hi - lo) + lo, 0.25, 1.60))


def clamp_attendance(pred_att_raw: float, capacity: int) -> int:
    """
    Convert raw model output to a realistic attendance figure.

    Realistic fill-rate bands for Tier-2/3 MP city events:
      demand >= 1.4x capacity  →  exceptional demand, cap at ~82%
      1.0x <= demand < 1.4x   →  strong demand, smooth fill 55% → 82%
      0.6x <= demand < 1.0x   →  trust model output (normal range)
      demand < 0.6x            →  weak demand, trust model output
    """
    capacity = max(1, capacity)
    demand_ratio = pred_att_raw / capacity

    if demand_ratio >= 1.4:
        result = int(capacity * 0.82)   # was 0.99 — true sellouts are rare
    elif demand_ratio >= 1.0:
        # Smooth fill: 55% at ratio=1.0, up to 82% at ratio=1.4
        fill_factor = 0.55 + 0.27 * ((demand_ratio - 1.0) / 0.4)
        result = int(capacity * fill_factor)
    else:
        result = int(pred_att_raw)      # model is within capacity, trust it

    return int(np.clip(result, 0, capacity))

def prob_band(prob: Optional[float]) -> Dict[str, str]:
    """Map acceptance probability to a human-readable potential tier."""
    if prob is None:
        return {"tier": "UNKNOWN", "label": "UNKNOWN"}
    p = float(np.clip(prob, 0.0, 1.0))
    if p >= 0.60:
        return {"tier": "HIGH",     "label": "HIGH POTENTIAL"}
    if p >= 0.35:
        return {"tier": "MEDIUM",   "label": "MEDIUM POTENTIAL"}
    if p >= 0.15:
        return {"tier": "LOW",      "label": "LOW POTENTIAL"}
    return {"tier": "UNLIKELY",     "label": "UNLIKELY"}


def roi_bucket(cost_per_head: float) -> str:
    if cost_per_head < 12:
        return "strong"
    if cost_per_head <= 25:
        return "moderate"
    return "weak"


def make_recommendations(
    predicted_attendance: int,
    sponsor_amount: float,
    marketing_budget: float,
    cost_per_head: float,
    competing_events: int,
    organizer_rep: float,
    lineup_q: float,
    synergy_score: int,
) -> List[dict]:
    """Generate up to 4 prioritized, actionable recommendations for the organizer."""
    recs: List[dict] = []

    if predicted_attendance > 0:
        if cost_per_head > 25:
            suggested = int(predicted_attendance * 15.0)
            recs.append({
                "action": (
                    f"Reduce ask to ~₹{suggested:,} or split into "
                    "stall / sampling / branding packages."
                ),
                "why": (
                    f"₹{cost_per_head:.2f}/reach is above the ₹12–₹20 comfort "
                    "zone for Tier-2/3 sponsors."
                ),
                "expected_effect": "Often increases acceptance by ~10–25 points.",
            })
        elif cost_per_head > 12:
            suggested = int(predicted_attendance * 12.0)
            recs.append({
                "action": (
                    f"Negotiate toward ₹{suggested:,} OR add measurable "
                    "deliverables to justify the current ask."
                ),
                "why": (
                    f"₹{cost_per_head:.2f}/reach is moderate; strong deliverables "
                    "can bridge the gap."
                ),
                "expected_effect": "Can increase acceptance by ~5–15 points.",
            })
        else:
            recs.append({
                "action": (
                    "Keep ask; strengthen deliverables — exclusivity + sampling + "
                    "QR lead capture + post-event report."
                ),
                "why": (
                    f"ROI is strong at ₹{cost_per_head:.2f}/reach. "
                    "Decision will hinge on measurement clarity."
                ),
                "expected_effect": "Can improve acceptance by ~5–12 points.",
            })

    if competing_events >= 8:
        recs.append({
            "action": "Lock category exclusivity + premium zones, or shift to a less cluttered date.",
            "why":    f"High competition ({competing_events} events) dilutes sponsor visibility.",
            "expected_effect": "Can improve acceptance by ~5–15 points.",
        })
    elif competing_events >= 5:
        recs.append({
            "action": "Differentiate with a signature activation: contest + sampling + influencer reel.",
            "why":    f"{competing_events} competing events make differentiation critical for recall.",
            "expected_effect": "Can improve acceptance by ~3–10 points.",
        })

    if organizer_rep < 0.60 or lineup_q < 0.55:
        recs.append({
            "action": (
                "Boost credibility: share past sponsor logos / testimonials, "
                "final lineup, permits, and timeline."
            ),
            "why": (
                f"Organizer trust is a primary risk signal "
                f"(rep={organizer_rep:.2f}, lineup={lineup_q:.2f})."
            ),
            "expected_effect": "Can improve acceptance by ~5–12 points.",
        })

    if predicted_attendance > 0:
        spend_per_att = marketing_budget / max(1.0, float(predicted_attendance))
        if spend_per_att < 8:
            suggested_mkt = int(predicted_attendance * 10)
            recs.append({
                "action": (
                    f"Increase marketing budget toward ~₹{suggested_mkt:,} "
                    "or add influencer / PR amplification."
                ),
                "why": (
                    f"Current spend ≈ ₹{spend_per_att:.1f}/attendee; "
                    "stronger demand lowers sponsor risk."
                ),
                "expected_effect": "Can improve acceptance by ~3–10 points.",
            })

    if synergy_score < 45:
        recs.append({
            "action": (
                "Switch to a higher-fit event type for this sponsor category, "
                "or realign the target audience."
            ),
            "why":    "Low synergy is a major deterrent for local sponsors.",
            "expected_effect": "Can improve acceptance by ~8–20 points.",
        })

    return recs[:4]


# ─────────────────────────────────────────────────────────────
# AI utilities
# ─────────────────────────────────────────────────────────────
def extract_json(text: str) -> Optional[dict]:
    """Safely extract the first JSON object from an LLM response string."""
    if not text:
        return None
    try:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group())
        return json.loads(text.replace("```json", "").replace("```", "").strip())
    except Exception:
        return None


def cold_email_to_string(value: Any) -> str:
    """Normalize cold email to a plain string regardless of LLM output format."""
    if not value:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        subj = value.get("Subject") or value.get("subject") or ""
        body = value.get("Body")    or value.get("body")    or ""
        return f"Subject: {subj}\n\n{body}".strip()
    try:
        return json.dumps(value, indent=2)
    except Exception:
        return str(value)


def _groq_chat(
    messages: List[Dict],
    max_tokens: int = 600,
    temperature: float = 0.25,
) -> Optional[str]:
    """Central entry point for every Groq API call with uniform error handling."""
    if groq_client is None:
        return None
    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=10.0,
        )
        return completion.choices[0].message.content
    except Exception as exc:
        logger.error(f"Groq API error: {exc}")
        return None


# ─────────────────────────────────────────────────────────────
# AI Call 1 — Synergy score (runs BEFORE ML prediction)
# ─────────────────────────────────────────────────────────────
def get_ai_synergy(
    brand_name: str,
    brand_description: Optional[str],
    event_type: str,
    event_description: Optional[str],
    city: str,
    sponsor_category: str,
) -> Optional[int]:
    """
    Ask Groq for a 0–100 brand-event synergy score.
    Returns None on any failure so the caller falls back to math.
    """
    prompt = (
        f"Brand: {brand_name} ({sponsor_category})\n"
        f"Brand Context: {brand_description or 'None provided.'}\n\n"
        f"Event: {event_type} in {city}\n"
        f"Event Context: {event_description or 'None provided.'}\n\n"
        "Task: Rate the brand-event synergy from 0 to 100 based on audience "
        "alignment, brand fit, and thematic relevance.\n"
        'Return ONLY valid JSON: {"synergy_score": <integer 0-100>}'
    )
    raw = _groq_chat(
        messages=[
            {"role": "system", "content": "You are a sponsorship evaluator. Output ONLY valid JSON."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=60,
        temperature=0.10,
    )
    parsed = extract_json(raw or "")
    if isinstance(parsed, dict) and "synergy_score" in parsed:
        val = int(np.clip(int(parsed["synergy_score"]), 0, 100))
        logger.info(f"AI synergy score: {val}/100")
        return val
    logger.warning("AI synergy returned invalid output; using math fallback.")
    return None


# ─────────────────────────────────────────────────────────────
# AI Call 2 — Full analysis bundle (runs AFTER ML prediction)
# Combines: insights + analysis + negotiation + cold email
# Reduces total Groq calls per /predict from 3 to 2.
# ─────────────────────────────────────────────────────────────
def _build_fallback_bundle(
    brand_name: str,
    sponsor_category: str,
    event_type: str,
    city: str,
    band_label: str,
    prob_pct: Optional[int],
    predicted_attendance: int,
    cost_per_head: float,
    competing_events: int,
    synergy: int,
    occupancy: float,
    roi_bucket_name: str,
    recommendations: List[dict],
) -> Dict[str, Any]:
    """
    Pure-Python fallback when Groq is unavailable or returns bad output.

    Cold email is written FROM the brand/sponsor TO the event organizer.
    Zero ML outputs appear in the email — it reads as a genuine business inquiry.
    """
    bucket = roi_bucket_name

    if bucket == "strong":
        obj1 = "We need clearer deliverables and measurement before committing."
        reb1 = (
            "We'll provide category exclusivity + sampling booth + QR lead capture "
            "+ stage mentions + a full post-event engagement report."
        )
    elif bucket == "moderate":
        obj1 = "We'd want stronger ROI guarantees or additional deliverables for this ask."
        reb1 = (
            "We can add influencer reel coverage + lead capture and "
            "restructure the deal into milestone-based packages."
        )
    else:
        obj1 = "The sponsorship ask feels high relative to the expected reach."
        reb1 = (
            "We can reduce the ask or split it into smaller, "
            "performance-linked packages that lower your risk."
        )

    if competing_events >= 8:
        obj2 = "There are many competing events nearby — we're concerned about attention dilution."
        reb2 = (
            "We'll lock premium branding zones + category exclusivity + "
            "a dedicated on-ground activation to ensure your brand stands out."
        )
    else:
        obj2 = "We want to understand how you'll differentiate this event from others."
        reb2 = (
            "We'll build a unique activation experience + influencer coverage + "
            "contest-based audience engagement specific to your brand."
        )

    ptxt     = f" (probability {prob_pct}%)" if prob_pct is not None else ""
    analysis = (
        f"{band_label}{ptxt}. "
        f"Competition: {competing_events} events. "
        f"Cost per reach: Rs.{cost_per_head:.2f} ({bucket} ROI bucket)."
    )

    # Cold email: sponsor → organizer, zero ML numbers
    cold_email = (
        f"Subject: Exploring a Sponsorship Partnership — {event_type} in {city}\n\n"
        f"Hi,\n\n"
        f"I'm reaching out from {brand_name}'s partnerships team. We came across "
        f"your upcoming {event_type} in {city} and feel there could be a genuine "
        f"alignment with our current brand direction in the {sponsor_category} space.\n\n"
        f"Before we move forward, we'd love to understand a couple of things better:\n\n"
        f"- Audience profile: Could you share more about the expected audience — "
        f"their age group, interests, and how they'll be engaged throughout the event? "
        f"We want to make sure our brand connects with the right people in a meaningful way.\n\n"
        f"- Brand visibility: What specific branding and activation opportunities "
        f"would be available to us? We'd want to ensure our presence is distinct "
        f"and not lost among other sponsors.\n\n"
        f"If these can be addressed, we're very open to discussing a partnership "
        f"structure that works for both sides. Would you be available for a "
        f"quick 15-minute call this week to go over the details?\n\n"
        f"Looking forward to hearing from you.\n\n"
        f"Warm regards,\n"
        f"{brand_name} Partnerships Team"
    )

    return {
        "headline": (
            f"{band_label}"
            f"{'' if prob_pct is None else f' ({prob_pct}%)'}"
        ),
        "explanation": (
            f"This score combines brand-event fit (synergy: {synergy}/100), "
            f"deal economics (Rs.{cost_per_head:.2f}/reach), "
            f"and risk factors like competition."
        ),
        "key_factors": [
            f"Synergy (fit): {synergy}/100",
            f"Predicted crowd: {predicted_attendance} (occupancy {occupancy:.1f}%)",
            f"Competition: {competing_events} competing events",
            f"Cost per reach: Rs.{cost_per_head:.2f} ({bucket} ROI bucket)",
            (
                f"Acceptance probability: {prob_pct}%"
                if prob_pct is not None
                else "Acceptance probability: N/A"
            ),
        ],
        "what_it_means": [
            "Synergy measures category + audience fit; it does not guarantee acceptance.",
            (
                "Potential reflects acceptance likelihood after accounting "
                "for competition and delivery risk."
            ),
        ],
        "next_actions": [
            r.get("action", "") for r in recommendations if r.get("action")
        ][:3],
        "caution":  "This is a decision-support estimate, not a guarantee of sponsor response.",
        "analysis": analysis,
        "negotiation_points": [
            {"objection": obj1, "rebuttal": reb1},
            {"objection": obj2, "rebuttal": reb2},
        ],
        "cold_email": cold_email,
    }


def get_ai_full_analysis(
    *,
    brand_name: str,
    brand_description: Optional[str],
    event_description: Optional[str],
    sponsor_category: str,
    city: str,
    event_type: str,
    band_label: str,
    prob_pct: Optional[int],
    synergy: int,
    predicted_attendance: int,
    occupancy: float,
    cost_per_head: float,
    competing_events: int,
    roi_bucket_name: str,
    recommendations: List[dict],
) -> Dict[str, Any]:
    """
    Single Groq call producing the complete post-prediction analysis bundle.

    Cold email rules enforced via prompt:
      - Written FROM brand/sponsor TO event organizer.
      - Zero ML scores, probabilities, or predicted numbers in the email body.
      - Reads as a genuine human business inquiry.

    Falls back to _build_fallback_bundle() on any Groq failure.
    """
    fallback = _build_fallback_bundle(
        brand_name=brand_name,
        sponsor_category=sponsor_category,
        event_type=event_type,
        city=city,
        band_label=band_label,
        prob_pct=prob_pct,
        predicted_attendance=predicted_attendance,
        cost_per_head=cost_per_head,
        competing_events=competing_events,
        synergy=synergy,
        occupancy=occupancy,
        roi_bucket_name=roi_bucket_name,
        recommendations=recommendations,
    )

    if groq_client is None:
        return fallback

    guardrail = (
        "GUARDRAIL: If cost_per_reach < Rs.12, ROI is strong — do NOT say cost is too high. "
        "If cost_per_reach > Rs.25, you may flag weak ROI. "
        "Never invent numbers not present in this prompt."
    )

    # Interpolated here so brand_name, event_type, city are concrete values
    cold_email_rules = (
        f"COLD EMAIL RULES (follow exactly):\n"
        f"  - Written FROM {brand_name}'s partnerships team TO the event organizer.\n"
        f"  - Do NOT write from the organizer's perspective.\n"
        f"  - Do NOT include predicted attendance, probability scores, synergy scores,\n"
        f"    cost-per-reach, occupancy rates, ROI labels, or any ML model output.\n"
        f"  - Use Brand Context and Event Context to make it feel personal and specific\n"
        f"    to this event ({event_type} in {city}).\n"
        f"  - Politely raise 1-2 natural sponsor concerns as questions\n"
        f"    (e.g. audience profile, brand visibility, exclusivity, measurement).\n"
        f"  - Close with a low-pressure call to action (short call or proposal deck).\n"
        f"  - Tone: professional, warm, concise — under 200 words.\n"
        f"  - Plain text only. First line must be 'Subject: ...'."
    )

    prob_str = f"{prob_pct}%" if prob_pct is not None else "N/A"

    prompt = f"""{guardrail}

{cold_email_rules}

Brand (EMAIL SENDER): {brand_name} ({sponsor_category})
Brand Context: {brand_description or 'None provided.'}

Event (EMAIL RECIPIENT is the organizer of this event): {event_type} in {city}
Event Context: {event_description or 'None provided.'}

Model outputs — use ONLY for headline, explanation, key_factors, what_it_means,
next_actions, caution, analysis, negotiation_points. NEVER in cold_email.
  Potential band:        {band_label}
  Acceptance prob:       {prob_str}
  Synergy (fit):         {synergy}/100
  Predicted crowd:       {predicted_attendance}
  Occupancy:             {occupancy:.1f}%
  Competing events:      {competing_events}
  Cost per reach:        Rs.{cost_per_head:.2f} (ROI bucket: {roi_bucket_name})

Return ONLY valid JSON with these EXACT keys:
{{
  "headline": "<string>",
  "explanation": "<1-2 sentences, plain business language>",
  "key_factors": ["<4-6 short strings>"],
  "what_it_means": ["<2 short strings>"],
  "next_actions": ["<2-3 actionable strings for the organizer>"],
  "caution": "<1 sentence>",
  "analysis": "<1 sentence summary of the deal>",
  "negotiation_points": [
    {{"objection": "<concern the sponsor would raise>", "rebuttal": "<how organizer addresses it>"}},
    {{"objection": "<concern the sponsor would raise>", "rebuttal": "<how organizer addresses it>"}}
  ],
  "cold_email": "<plain text, Subject first, FROM {brand_name} TO organizer, zero ML numbers>"
}}"""

    raw = _groq_chat(
        messages=[
            {"role": "system", "content": "You are a sponsorship strategist. Output ONLY valid JSON."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=950,
        temperature=0.25,
    )
    parsed = extract_json(raw or "")
    if not isinstance(parsed, dict):
        logger.warning("AI full analysis returned invalid JSON; using fallback.")
        return fallback

    # Merge — fallback values stay as safety net for missing keys
    for key in (
        "headline", "explanation", "key_factors", "what_it_means",
        "next_actions", "caution", "analysis", "negotiation_points", "cold_email",
    ):
        if parsed.get(key):
            fallback[key] = parsed[key]

    # Sanitize list fields
    for lk in ("key_factors", "what_it_means", "next_actions"):
        if not isinstance(fallback.get(lk), list):
            fallback[lk] = []
    fallback["next_actions"] = [
        str(x) for x in fallback["next_actions"] if str(x).strip()
    ][:3]

    # Sanitize negotiation_points
    nps = fallback.get("negotiation_points", [])
    fallback["negotiation_points"] = [
        p for p in (nps if isinstance(nps, list) else [])
        if isinstance(p, dict) and "objection" in p and "rebuttal" in p
    ][:2]

    fallback["cold_email"] = cold_email_to_string(fallback.get("cold_email"))
    return fallback


# ─────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────
class BrandInput(BaseModel):
    company_name: str
    industry: str
    brand_description: Optional[str] = None


class EventInput(BaseModel):
    city: str
    event_type: str
    sponsor_category: str

    brand_name: Optional[str]        = "Brand"
    brand_description: Optional[str] = None
    event_description: Optional[str] = None

    date: str            = Field(..., description="Event date in YYYY-MM-DD format.")
    price: float         = Field(..., ge=0, description="Ticket price in INR.")
    marketing_budget: float = Field(..., ge=0, description="Marketing spend in INR.")
    sponsor_amount: float   = Field(..., ge=0, description="Sponsorship ask amount in INR.")
    venue_capacity: int     = Field(..., ge=1, description="Maximum venue capacity.")

    # Event / organizer quality signals
    organizer_reputation:  Optional[float] = Field(None, ge=0.0, le=1.0)
    lineup_quality:        Optional[float] = Field(None, ge=0.0, le=1.0)
    is_indoor:             Optional[int]   = Field(None, ge=0, le=1)
    social_media_reach:    Optional[int]   = Field(None, ge=0)
    past_events_organized: Optional[int]   = Field(None, ge=0)

    # Brand-level signals
    brand_annual_budget: Optional[int] = Field(
        None, ge=0,
        description=(
            "Brand's estimated annual sponsorship budget in INR. "
            "If omitted, the category benchmark is used. "
            "Do NOT derive from sponsor_amount."
        ),
    )
    brand_kpi:                Optional[Literal["awareness", "hybrid", "leads", "sales"]]  = None
    brand_city_focus:         Optional[Literal["all_mp", "metro", "tier2", "pilgrimage"]] = None
    brand_activation_maturity: Optional[float] = Field(None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _validate_date(self) -> "EventInput":
        try:
            datetime.strptime(self.date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("'date' must be in YYYY-MM-DD format.")
        return self


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
def health():
    """
    Liveness and readiness probe.
    Intentionally public — monitoring tools need this without auth.
    """
    return {
        "ok":            True,
        "models_loaded": _models_ready(),
        "groq_enabled":  groq_client is not None,
        "auth_enabled":  bool(SERVICE_API_KEY),
        "version":       "3.0.0",
        "feature_count": len(EXPECTED_COLUMNS),
    }


@app.post("/analyze-brand", tags=["AI"])
def analyze_brand(
    data: BrandInput,
    _key: str = Depends(require_api_key),
):
    """AI-generated brand profile shown on the setup screen."""
    base: Dict[str, Any] = {
        "target_audience":   "General Audience",
        "core_values":       "Growth",
        "persona":           "Standard",
        "strategy_statement": "Maximize visibility across Madhya Pradesh events.",
    }
    if groq_client is None:
        return base

    prompt = (
        f"Analyze brand: {data.company_name} ({data.industry}).\n"
        f"Brand Context: {data.brand_description or 'None provided.'}\n"
        "Return JSON with keys: target_audience, core_values, persona, strategy_statement."
    )
    raw = _groq_chat(
        messages=[
            {"role": "system", "content": "You output ONLY valid JSON. No Markdown."},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=400,
        temperature=0.25,
    )
    parsed = extract_json(raw or "")
    if isinstance(parsed, dict):
        base.update(parsed)
    return base


@app.post("/predict", tags=["Prediction"])
def predict(
    data: EventInput,
    _key: str = Depends(require_api_key),
):
    """
    Main prediction endpoint — two-stage XGBoost pipeline.

    Groq API usage per request:
      Call 1 (pre-ML):  Synergy score
      Call 2 (post-ML): Combined insights + negotiation + cold email
    """
    if not _models_ready():
        raise HTTPException(
            status_code=503,
            detail="ML models are not loaded. Check server startup logs.",
        )

    # ── Canonicalize inputs ──────────────────────────────────────
    city             = canonical_city(data.city)
    event_type       = canonical_event_type(data.event_type)
    sponsor_category = canonical_brand_category(data.sponsor_category)

    # ── Calendar features ────────────────────────────────────────
    dt          = datetime.strptime(data.date, "%Y-%m-%d")
    month       = dt.month
    day_of_week = dt.weekday()
    is_weekend  = int(day_of_week in (5, 6))
    is_festive  = int(month in FESTIVE_MONTHS)
    temperature, humidity, is_raining = MP_WEATHER_DEFAULTS.get(month, (25, 60, 0))
    competing_events = competition_expected(city, is_weekend, is_festive)

    # ── Financial features ───────────────────────────────────────
    sponsor_amount = float(max(0.0, data.sponsor_amount))

    # Use supplied budget when available.
    # Intentionally NOT multiplying sponsor_amount — that caused circular inflation.
    brand_annual_budget = (
        int(data.brand_annual_budget)
        if data.brand_annual_budget
        else BRAND_BUDGET_DEFAULTS.get(sponsor_category, 20_00_000)
    )

    # ── Quality signals ──────────────────────────────────────────
    organizer_rep             = float(np.clip(data.organizer_reputation or 0.55, 0.05, 0.97))
    lineup_q                  = float(np.clip(data.lineup_quality       or 0.50, 0.05, 0.98))
    brand_activation_maturity = float(np.clip(data.brand_activation_maturity or 0.55, 0.0, 1.0))
    brand_kpi                 = data.brand_kpi        or "awareness"
    brand_city_focus          = data.brand_city_focus or "all_mp"

    # ── Groq call 1 — AI synergy (pre-prediction) ───────────────
    ai_synergy = get_ai_synergy(
        brand_name=data.brand_name or "Brand",
        brand_description=data.brand_description,
        event_type=event_type,
        event_description=data.event_description,
        city=city,
        sponsor_category=sponsor_category,
    )

    if ai_synergy is not None:
        synergy_score  = ai_synergy
        fit_score      = synergy_to_fit(synergy_score)
        synergy_source = "ai"
    else:
        fit_score      = compute_fit_score(sponsor_category, event_type)
        synergy_score  = fit_to_synergy(fit_score)
        synergy_source = "math"

    logger.info(
        f"fit={fit_score:.4f} synergy={synergy_score}/100 source={synergy_source} "
        f"city={city} event={event_type} category={sponsor_category}"
    )

    # ── Build feature matrix ─────────────────────────────────────
    x = pd.DataFrame(0.0, index=[0], columns=EXPECTED_COLUMNS)

    numeric_features: Dict[str, float] = {
        "month":                     float(month),
        "day_of_week":               float(day_of_week),
        "is_weekend":                float(is_weekend),
        "is_festive":                float(is_festive),
        "is_indoor":                 1.0 if data.is_indoor is None else float(data.is_indoor),
        "temperature":               float(temperature),
        "is_raining":                float(is_raining),
        "humidity":                  float(humidity),
        "venue_capacity":            float(max(0, data.venue_capacity)),
        "ticket_price":              float(max(0.0, data.price)),
        "marketing_budget":          float(max(0.0, data.marketing_budget)),
        "organizer_reputation":      organizer_rep,
        "lineup_quality":            lineup_q,
        "social_media_reach":        float(max(0, data.social_media_reach or 15_000)),
        "past_events_organized":     float(max(0, data.past_events_organized or 5)),
        "competing_events":          float(competing_events),
        "brand_annual_budget":       float(brand_annual_budget),
        "brand_activation_maturity": brand_activation_maturity,
        "fit_score":                 float(fit_score),
        "sponsor_amount":            float(sponsor_amount),
    }
    for col, val in numeric_features.items():
        if col in x.columns:
            x.at[0, col] = val

    def _set_onehot(col: str) -> None:
        if col in x.columns:
            x.at[0, col] = 1.0

    _set_onehot(f"city_{city}")
    _set_onehot(f"event_type_{event_type}")
    _set_onehot(f"brand_category_{sponsor_category}")

    # "awareness" and "all_mp" are reference categories — no column needed
    if brand_kpi != "awareness":
        _set_onehot(f"brand_kpi_{brand_kpi}")
    if brand_city_focus != "all_mp":
        _set_onehot(f"brand_city_focus_{brand_city_focus}")

    # ── Stage 1 — Predict attendance ────────────────────────────
    X_scaled     = scaler.transform(x)
    pred_att_raw = float(attendance_model.predict(X_scaled)[0])
    capacity     = int(max(1, data.venue_capacity))
    predicted_att = clamp_attendance(pred_att_raw, capacity)

    # ADD THIS — exposes the raw issue immediately
    demand_ratio_debug = pred_att_raw / capacity
    logger.info(
        f"Attendance raw={pred_att_raw:.1f} capacity={capacity} "
        f"demand_ratio={demand_ratio_debug:.3f}"
    )

    # ── Stage 2 — Predict sponsor acceptance ────────────────────
    # pred_att_raw (not clamped) is appended to preserve the
    # distribution the model was trained on.
    X_stage2 = np.column_stack((X_scaled, [[pred_att_raw]]))
    y_hat    = int(sponsor_model.predict(X_stage2)[0])

    prob: Optional[float] = None
    if hasattr(sponsor_model, "predict_proba"):
        try:
            prob = float(sponsor_model.predict_proba(X_stage2)[0][1])
        except Exception as exc:
            logger.warning(f"predict_proba failed: {exc}")

    # ── Derived metrics ──────────────────────────────────────────
    cost_per_head = (sponsor_amount / predicted_att) if predicted_att > 0 else 0.0
    occupancy     = (predicted_att / capacity) * 100.0
    bucket        = roi_bucket(cost_per_head)
    band          = prob_band(prob)
    prob_pct      = (
        None if prob is None
        else int(round(float(np.clip(prob, 0.0, 1.0)) * 100))
    )
    verdict = (
        f"{band['label']} ({prob_pct}%)"
        if prob_pct is not None
        else band["label"]
    )

    # ── Recommendations (no Groq call) ──────────────────────────
    recs = make_recommendations(
        predicted_attendance=predicted_att,
        sponsor_amount=sponsor_amount,
        marketing_budget=float(data.marketing_budget),
        cost_per_head=cost_per_head,
        competing_events=competing_events,
        organizer_rep=organizer_rep,
        lineup_q=lineup_q,
        synergy_score=synergy_score,
    )

    # ── Groq call 2 — Full analysis bundle (post-prediction) ────
    ai_out = get_ai_full_analysis(
        brand_name=data.brand_name or "Brand",
        brand_description=data.brand_description,
        event_description=data.event_description,
        sponsor_category=sponsor_category,
        city=city,
        event_type=event_type,
        band_label=band["label"],
        prob_pct=prob_pct,
        synergy=synergy_score,
        predicted_attendance=predicted_att,
        occupancy=occupancy,
        cost_per_head=cost_per_head,
        competing_events=competing_events,
        roi_bucket_name=bucket,
        recommendations=recs,
    )

    # ── Response ─────────────────────────────────────────────────
    return {
        "normalized_input": {
            "city":             city,
            "event_type":       event_type,
            "sponsor_category": sponsor_category,
            "brand_kpi":        brand_kpi,
            "brand_city_focus": brand_city_focus,
        },
        "attendance":                  predicted_att,
        "attendance_raw_model_output": round(pred_att_raw, 4),

        "ml_is_feasible":          bool(y_hat == 1),
        "feasibility_probability": None if prob is None else round(prob, 4),

        "verdict":       verdict,
        "verdict_band":  band["tier"],
        "verdict_label": band["label"],

        "breakdown": {
            "occupancy_rate":   round(occupancy, 1),
            "brand_synergy":    synergy_score,
            "synergy_source":   synergy_source,
            "cost_per_head":    round(cost_per_head, 2),
            "competing_events": competing_events,
            "roi_bucket":       bucket,
        },

        "ai_insights": {
            "headline":      ai_out.get("headline", ""),
            "explanation":   ai_out.get("explanation", ""),
            "key_factors":   ai_out.get("key_factors", []),
            "what_it_means": ai_out.get("what_it_means", []),
            "next_actions":  ai_out.get("next_actions", []),
            "caution":       ai_out.get("caution", ""),
        },

        "recommendations":    recs,
        "ai_analysis":        ai_out.get("analysis", ""),
        "negotiation_points": ai_out.get("negotiation_points", []),
        "cold_email":         cold_email_to_string(ai_out.get("cold_email", "")),
    }


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEV_MODE", "").lower() in ("1", "true", "yes"),
        log_level="info",
    )