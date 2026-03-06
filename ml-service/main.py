import os
import sys
import json
import re
from datetime import datetime
from typing import Optional, Literal, List, Any, Dict

import joblib
import numpy as np
import pandas as pd
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────
# NumPy pickle compatibility shim
# ─────────────────────────────────────────────────────────────
try:
    core = getattr(np, "_core", None) or getattr(np, "core", None)
    if core is not None:
        sys.modules.setdefault("numpy._core", core)
        ma = getattr(core, "multiarray", None)
        if ma is not None:
            sys.modules.setdefault("numpy._core.multiarray", ma)
        um = getattr(core, "_multiarray_umath", None)
        if um is not None:
            sys.modules.setdefault("numpy._core._multiarray_umath", um)
except Exception:
    pass

# Groq optional
try:
    from groq import Groq
except Exception:
    Groq = None

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI(title="SponsorWise ML Service", version="2.0.0-Agentic")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = None
if Groq is not None and GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        client = None

# ─────────────────────────────────────────────────────────────
# Load artifacts
# ─────────────────────────────────────────────────────────────
scaler = attendance_model = sponsor_model = None
EXPECTED_COLUMNS: List[str] = []

try:
    scaler = joblib.load(os.path.join(current_dir, "feature_scaler.pkl"))
    attendance_model = joblib.load(os.path.join(current_dir, "stage1_attendance_xgboost.pkl"))
    sponsor_model = joblib.load(os.path.join(current_dir, "stage2_sponsor_xgboost.pkl"))
    EXPECTED_COLUMNS = list(getattr(scaler, "feature_names_in_", []))
    if len(EXPECTED_COLUMNS) != 67:
        raise ValueError(f"Scaler feature count={len(EXPECTED_COLUMNS)}; expected 67.")
    print("✅ Two-Stage ML Pipeline loaded successfully.")
except Exception as e:
    print(f"⚠️ ML Model Loading Error: {e}")
    scaler = attendance_model = sponsor_model = None
    EXPECTED_COLUMNS = []

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────
MP_WEATHER_DEFAULTS = {
    1:  (17, 55, 0), 2:  (20, 45, 0), 3:  (26, 32, 0),
    4:  (32, 25, 0), 5:  (36, 28, 0), 6:  (34, 58, 1),
    7:  (28, 82, 1), 8:  (27, 85, 1), 9:  (28, 78, 0),
    10: (27, 58, 0), 11: (22, 52, 0), 12: (18, 55, 0),
}
FESTIVE_MONTHS = {1, 2, 3, 4, 8, 9, 10, 11, 12}

CITIES_POP = {
    "Indore": 35.0, "Bhopal": 28.0, "Jabalpur": 16.0, "Gwalior": 12.0,
    "Ujjain": 6.5,  "Sagar": 4.0,   "Dewas": 3.5,    "Satna": 3.5,
    "Rewa": 2.8,    "Ratlam": 3.0,  "Katni": 2.5,    "Chhindwara": 2.0,
    "Khandwa": 2.5, "Burhanpur": 2.2, "Morena": 2.5, "Singrauli": 2.8,
    "Vidisha": 2.0, "Narmadapuram": 1.8, "Shivpuri": 1.8, "Damoh": 1.5,
    "Sehore": 1.5,  "Seoni": 1.3,   "Neemuch": 1.3,  "Mandsaur": 1.5,
    "Khargone": 1.8,
}

BRAND_BUDGET_DEFAULTS = {
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

BRAND_AFFINITIES = {
    "FMCG":                 {"aud": ["mass", "family"],            "aff": ["Food Festival", "Cricket Screening", "Religious/Cultural", "College Fest"]},
    "Beverage":             {"aud": ["mass", "youth", "family"],   "aff": ["Music Concert", "Food Festival", "Cricket Screening", "College Fest", "Sports Tournament"]},
    "Fintech":              {"aud": ["youth", "professional"],     "aff": ["Tech Meetup", "Business Conference", "College Fest"]},
    "Edtech":               {"aud": ["youth"],                     "aff": ["Tech Meetup", "College Fest"]},
    "Automobile":           {"aud": ["mass", "professional"],      "aff": ["Sports Tournament", "Cricket Screening", "Business Conference", "Music Concert"]},
    "Telecom":              {"aud": ["mass", "youth"],             "aff": ["Music Concert", "Cricket Screening", "College Fest", "Food Festival", "Religious/Cultural"]},
    "Apparel":              {"aud": ["youth", "family"],           "aff": ["Music Concert", "College Fest", "Standup Comedy", "Food Festival"]},
    "Beauty/Personal Care": {"aud": ["youth", "family"],           "aff": ["Music Concert", "College Fest", "Food Festival"]},
    "Local Retail":         {"aud": ["mass", "family"],            "aff": ["Religious/Cultural", "Food Festival", "Sports Tournament", "Cricket Screening"]},
    "Real Estate":          {"aud": ["professional", "family"],    "aff": ["Business Conference", "Cricket Screening", "Religious/Cultural"]},
}

EVENT_TAGS = {
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

EVENT_LOOKUP = {
    "stand-up comedy": "Standup Comedy",
    "standup comedy": "Standup Comedy",
    "religious cultural": "Religious/Cultural",
    "tech meet-up": "Tech Meetup",
}
BRAND_LOOKUP = {
    "beauty": "Beauty/Personal Care",
    "personal care": "Beauty/Personal Care",
    "fmcg": "FMCG",
}

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()

def canonical_city(s: str) -> str:
    t = (s or "").strip()
    for c in CITIES_POP.keys():
        if _norm(c) == _norm(t):
            return c
    return t

def canonical_event_type(s: str) -> str:
    t = (s or "").strip()
    return EVENT_LOOKUP.get(_norm(t), t)

def canonical_brand_category(s: str) -> str:
    t = (s or "").strip()
    return BRAND_LOOKUP.get(_norm(t), t)

def competition_expected(city: str, is_weekend: int, is_festive: int) -> int:
    pop = float(CITIES_POP.get(city, 10.0))
    lam = 0.8 + 0.08 * pop
    if is_weekend:
        lam *= 1.6
    if is_festive:
        lam *= 1.4
    return int(np.clip(round(lam), 0, 25))

def extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group())
        return json.loads(text.replace("```json", "").replace("```", "").strip())
    except Exception:
        return None

def cold_email_to_string(cold_email: Any) -> str:
    if not cold_email:
        return ""
    if isinstance(cold_email, str):
        return cold_email
    if isinstance(cold_email, dict):
        subj = cold_email.get("Subject") or cold_email.get("subject") or ""
        body = cold_email.get("Body") or cold_email.get("body") or ""
        return (f"Subject: {subj}\n\n{body}").strip()
    try:
        return json.dumps(cold_email, indent=2)
    except Exception:
        return str(cold_email)

# ─────────────────────────────────────────────────────────────
# 🧠 CORE UPDATE: The Reverse-Scaler & Synergy Math
# ─────────────────────────────────────────────────────────────
def compute_fit_score(brand_cat: str, event_type: str) -> float:
    """Old Math Fallback: Used if the AI fails"""
    bc = BRAND_AFFINITIES.get(brand_cat, {"aud": ["mass"], "aff": []})
    tags = EVENT_TAGS.get(event_type, ["mass"])
    type_match = 1.0 if event_type in bc["aff"] else 0.55
    overlap = len(set(bc["aud"]).intersection(set(tags)))
    aud_score = {0: 0.50, 1: 0.82, 2: 1.05}.get(overlap, 1.10)
    city_fit = 0.95
    return float(np.clip(type_match * aud_score * city_fit, 0.25, 1.60))

def fit_to_synergy(fit_score: float) -> int:
    """Old Math Fallback: Converts ML decimal to UI percentage"""
    lo, hi = 0.55, 1.25
    return int(np.clip((fit_score - lo) / (hi - lo) * 100, 0, 100))

def synergy_to_fit(synergy_score: int) -> float:
    """REVERSE SCALER: Converts AI 0-100 score back into ML decimal for XGBoost"""
    lo, hi = 0.55, 1.25
    # Algebra: reverse the fit_to_synergy formula
    fit = (synergy_score / 100.0) * (hi - lo) + lo
    return float(np.clip(fit, 0.25, 1.60))


# ─────────────────────────────────────────────────────────────
# Bands + Recommendations + AI Insights
# ─────────────────────────────────────────────────────────────
def prob_band(prob: Optional[float]) -> Dict[str, Any]:
    if prob is None:
        return {"tier": "UNKNOWN", "label": "UNKNOWN"}
    p = float(np.clip(prob, 0.0, 1.0))
    if p >= 0.60:
        return {"tier": "HIGH", "label": "HIGH POTENTIAL"}
    if p >= 0.35:
        return {"tier": "MEDIUM", "label": "MEDIUM POTENTIAL"}
    if p >= 0.15:
        return {"tier": "LOW", "label": "LOW POTENTIAL"}
    return {"tier": "UNLIKELY", "label": "UNLIKELY"}

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
    recs: List[dict] = []

    if predicted_attendance > 0:
        if cost_per_head > 25:
            target_cpr = 15.0
            suggested = int(predicted_attendance * target_cpr)
            recs.append({
                "action": f"Reduce ask near ₹{suggested:,} or split into packages (stall/sampling/branding).",
                "why": f"Current cost per reach is ₹{cost_per_head:.2f}. Local sponsors prefer ~₹12–₹20 for Tier-2/3 events.",
                "expected_effect": "Often increases acceptance by ~10–25 points."
            })
        elif cost_per_head > 12:
            target_cpr = 12.0
            suggested = int(predicted_attendance * target_cpr)
            recs.append({
                "action": f"Negotiate ask around ₹{suggested:,} OR keep ask and add measurable deliverables.",
                "why": f"Cost per reach ₹{cost_per_head:.2f} is moderate. Strong deliverables can justify it.",
                "expected_effect": "Can increase acceptance by ~5–15 points."
            })
        else:
            recs.append({
                "action": "Keep ask and strengthen deliverables: exclusivity + sampling + QR leads + post-event report.",
                "why": f"ROI looks strong at ₹{cost_per_head:.2f}/reach; decision may hinge on measurement & deliverables.",
                "expected_effect": "Can improve acceptance by ~5–12 points."
            })

    if competing_events >= 8:
        recs.append({
            "action": "Secure category exclusivity + prime zones, or shift to a less cluttered weekend.",
            "why": f"Competition is high ({competing_events} events). Sponsors worry about attention dilution.",
            "expected_effect": "Can improve acceptance by ~5–15 points."
        })
    elif competing_events >= 5:
        recs.append({
            "action": "Differentiate with a signature activation (contest + sampling + influencer reel).",
            "why": f"There are {competing_events} competing events; differentiation improves recall.",
            "expected_effect": "Can improve acceptance by ~3–10 points."
        })

    if organizer_rep < 0.60 or lineup_q < 0.55:
        recs.append({
            "action": "Boost credibility: show past sponsor logos/testimonials + final lineup + permits + timeline.",
            "why": f"Organizer confidence affects sponsor risk (rep={organizer_rep:.2f}, lineup={lineup_q:.2f}).",
            "expected_effect": "Can improve acceptance by ~5–12 points."
        })

    if predicted_attendance > 0:
        spend_per_att = marketing_budget / max(1.0, predicted_attendance)
        if spend_per_att < 8:
            suggested_mkt = int(predicted_attendance * 10)
            recs.append({
                "action": f"Increase marketing budget toward ~₹{suggested_mkt:,} or add influencer/PR support.",
                "why": f"Current marketing spend ≈ ₹{spend_per_att:.1f} per attendee; boosting demand reduces sponsor risk.",
                "expected_effect": "Can improve acceptance by ~3–10 points."
            })

    if synergy_score < 45:
        recs.append({
            "action": "Switch to a higher-fit event type for this sponsor category (or adjust target audience).",
            "why": "Low synergy indicates mismatch; fit is a major driver for local sponsors.",
            "expected_effect": "Can improve acceptance by ~8–20 points."
        })

    return recs[:4]

def generate_ai_insights(
    *,
    brand: str,
    brand_description: Optional[str],
    event_description: Optional[str],
    sponsor_category: str,
    city: str,
    event_type: str,
    prob: Optional[float],
    band_label: str,
    synergy: int,
    predicted_attendance: int,
    occupancy: float,
    cost_per_head: float,
    competing_events: int,
    roi_bucket_name: str,
    recommendations: List[dict],
) -> Dict[str, Any]:
    prob_pct = None if prob is None else int(round(float(np.clip(prob, 0.0, 1.0)) * 100))

    base = {
        "headline": f"{band_label}{'' if prob_pct is None else f' ({prob_pct}%)'}",
        "explanation": (
            f"This score combines brand-event fit (synergy), deal economics (₹/reach), "
            f"and risk factors like competition."
        ),
        "key_factors": [
            f"Synergy (fit): {synergy}/100",
            f"Predicted crowd: {predicted_attendance} (occupancy {occupancy:.1f}%)",
            f"Competition: {competing_events} competing events",
            f"Cost per reach: ₹{cost_per_head:.2f} ({roi_bucket_name} ROI bucket)",
            f"Acceptance probability: {prob_pct}%" if prob_pct is not None else "Acceptance probability: N/A",
        ],
        "what_it_means": [
            "Synergy measures category + audience fit; it does not guarantee a sponsor will accept.",
            "Potential reflects acceptance likelihood after considering competition + deliverables risk.",
        ],
        "next_actions": [r.get("action", "") for r in recommendations if r.get("action")][:3],
        "caution": "This is an estimate (decision-support), not a guarantee of sponsor response."
    }

    if client is None:
        return base

    system_prompt = "You are a sponsorship analyst. Output ONLY valid JSON. No Markdown."
    prompt = f"""
Brand: {brand}
Sponsor category: {sponsor_category}
Brand Context: {brand_description or 'No specific description provided.'}

Event: {event_type} in {city}
Event Context: {event_description or 'No specific description provided.'}

Model outputs:
- Potential band: {band_label}
- Probability: {prob_pct if prob_pct is not None else "N/A"}%
- Synergy (fit): {synergy}/100
- Predicted crowd: {predicted_attendance}
- Occupancy: {occupancy:.1f}%
- Competing events: {competing_events}
- Cost per reach: ₹{cost_per_head:.2f} (ROI bucket: {roi_bucket_name})

Task:
Explain these outputs in simple, business language.
Important rules:
- Take the Brand Context and Event Context into account when explaining the synergy fit.
- If cost_per_reach < 12, say ROI is strong (do NOT say it's too high).
- Emphasize synergy = fit, potential = acceptance likelihood.
- Don't invent numbers not provided.
- Keep it concise and helpful.

Return JSON with EXACT keys:
headline (string),
explanation (string, 1–2 sentences),
key_factors (array of 4–6 short strings),
what_it_means (array of 2 short strings),
next_actions (array of 2–3 short strings),
caution (string, 1 sentence)
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=650,
        )
        parsed = extract_json(completion.choices[0].message.content)
        if isinstance(parsed, dict):
            for k in ["headline", "explanation", "key_factors", "what_it_means", "next_actions", "caution"]:
                if k in parsed and parsed[k]:
                    base[k] = parsed[k]
    except Exception as e:
        print(f"❌ AI Insights Error: {e}")

    if not isinstance(base.get("key_factors"), list):
        base["key_factors"] = []
    if not isinstance(base.get("what_it_means"), list):
        base["what_it_means"] = []
    if not isinstance(base.get("next_actions"), list):
        base["next_actions"] = []

    base["next_actions"] = [str(x) for x in base["next_actions"] if str(x).strip()][:3]
    return base

# ─────────────────────────────────────────────────────────────
# AI negotiation/email bundle (existing)
# ─────────────────────────────────────────────────────────────
def fallback_ai(verdict_label: str, prob_pct: Optional[int], predicted_attendance: int,
               cost_per_head: float, competing_events: int, sponsor_category: str):
    bucket = roi_bucket(cost_per_head)

    if bucket == "strong":
        objection1 = "We need clearer deliverables and measurement."
        rebuttal1 = "We’ll include category exclusivity + sampling booth + QR lead capture + stage mentions + post-event report."
    elif bucket == "moderate":
        objection1 = "We’d want stronger ROI or deliverables for this ask."
        rebuttal1 = "We can add influencer reels + lead capture and restructure the deal into milestones."
    else:
        objection1 = "The ask is high relative to expected reach."
        rebuttal1 = "We can reduce the ask or split into smaller packages with performance-linked payout."

    if competing_events >= 8:
        objection2 = "There are too many competing events (attention dilution)."
        rebuttal2 = "We’ll lock premium branding zones + offer category exclusivity + run an interactive activation."
    else:
        objection2 = "We need stronger differentiation versus other events."
        rebuttal2 = "We’ll add unique on-ground activation + influencer coverage + contest-based engagement."

    ptxt = "" if prob_pct is None else f" (probability {prob_pct}%)"
    analysis = (
        f"{verdict_label}{ptxt}. Competition is {competing_events} events. "
        f"Cost per reach is ₹{cost_per_head:.2f} ({bucket} ROI bucket)."
    )

    cold_email = (
        "Subject: Sponsorship Proposal — High-visibility opportunity in MP\n\n"
        "Hi Team,\n\n"
        f"We’re hosting an upcoming event with a projected crowd of ~{predicted_attendance} attendees. "
        f"We’d love to partner with you as the {sponsor_category} sponsor with measurable deliverables.\n\n"
        "Highlights:\n"
        f"- Projected attendees: ~{predicted_attendance}\n"
        f"- Estimated cost per reach: ₹{cost_per_head:.2f}\n"
        "- Category exclusivity + sampling/booth + QR lead capture\n\n"
        "If you’re open, I can share a 1-page deck with deliverables and flexible pricing.\n\n"
        "Regards,\nSponsorWise Team"
    )

    return {
        "analysis": analysis,
        "negotiation_points": [
            {"objection": objection1, "rebuttal": rebuttal1},
            {"objection": objection2, "rebuttal": rebuttal2},
        ],
        "cold_email": cold_email,
    }

def generate_ai_bundle(*, sponsor_category: str, event_type: str, city: str,
                       brand_name: str, brand_description: Optional[str], event_description: Optional[str],
                       predicted_attendance: int, cost_per_head: float,
                       verdict_label: str, prob: Optional[float], competing_events: int):
    prob_pct = None if prob is None else int(round(float(np.clip(prob, 0.0, 1.0)) * 100))
    base = fallback_ai(verdict_label, prob_pct, predicted_attendance, cost_per_head, competing_events, sponsor_category)

    if client is None:
        base["cold_email"] = cold_email_to_string(base.get("cold_email"))
        return base

    bucket = roi_bucket(cost_per_head)
    guardrail = (
        "Important: If cost_per_reach < 12 INR, do NOT claim cost is too high. "
        "Focus objections on deliverables/measurement and differentiation. "
        "If cost_per_reach > 25 INR, you can discuss ask/ROI being high."
    )

    system_prompt = "You are a sponsorship strategist. Output ONLY valid JSON. No Markdown."
    prompt = f"""
{guardrail}

Brand: {brand_name}
Brand Category: {sponsor_category}
Brand Context: {brand_description or 'No specific description provided.'}
Event: {event_type} in {city}
Event Context: {event_description or 'No specific description provided.'}

Projected crowd: {predicted_attendance}
Cost per reach: ₹{cost_per_head:.2f} (ROI bucket: {bucket})
Competing events: {competing_events}
Model probability: {None if prob is None else round(prob, 4)}
Verdict label: {verdict_label}

Return JSON with keys:
analysis (1 sentence),
negotiation_points (2 items list of objects with keys objection and rebuttal),
cold_email (either a string or object with Subject/Body).
"""
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=700,
        )
        parsed = extract_json(completion.choices[0].message.content)
        if isinstance(parsed, dict):
            if "analysis" in parsed:
                base["analysis"] = parsed["analysis"]
            if "negotiation_points" in parsed and isinstance(parsed["negotiation_points"], list):
                base["negotiation_points"] = parsed["negotiation_points"][:2]
            if "cold_email" in parsed:
                base["cold_email"] = parsed["cold_email"]
    except Exception as e:
        print(f"❌ AI Error: {e}")

    base["cold_email"] = cold_email_to_string(base.get("cold_email"))
    return base

# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────
class BrandInput(BaseModel):
    company_name: str
    industry: str

class EventInput(BaseModel):
    city: str
    event_type: str
    sponsor_category: str
    
    brand_name: Optional[str] = "Brand"
    brand_description: Optional[str] = None
    event_description: Optional[str] = None

    date: str = Field(..., description="YYYY-MM-DD")
    price: float
    marketing_budget: float
    sponsor_amount: float
    venue_capacity: int

    organizer_reputation: Optional[float] = Field(None, ge=0.0, le=1.0)
    lineup_quality: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_indoor: Optional[int] = Field(None, ge=0, le=1)
    social_media_reach: Optional[int] = Field(None, ge=0)
    past_events_organized: Optional[int] = Field(None, ge=0)

    brand_kpi: Optional[Literal["awareness", "hybrid", "leads", "sales"]] = None
    brand_city_focus: Optional[Literal["all_mp", "metro", "tier2", "pilgrimage"]] = None
    brand_activation_maturity: Optional[float] = Field(None, ge=0.0, le=1.0)

# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "ok": True,
        "models_loaded": bool(scaler and attendance_model and sponsor_model),
        "groq_enabled": bool(client),
        "version": "2.0.0-Agentic",
        "feature_count": len(EXPECTED_COLUMNS),
    }

@app.post("/analyze-brand")
def analyze_brand(data: BrandInput):
    base = {
        "target_audience": "General Audience",
        "core_values": "Growth",
        "persona": "Standard",
        "strategy_statement": "Maximize visibility in Madhya Pradesh events.",
    }
    if client is None:
        return base

    system_prompt = "You output ONLY valid JSON. No Markdown."
    prompt = (
        f"Analyze brand: {data.company_name} ({data.industry}). "
        "Return JSON keys: target_audience, core_values, persona, strategy_statement."
    )
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=400,
        )
        parsed = extract_json(completion.choices[0].message.content)
        if isinstance(parsed, dict):
            base.update(parsed)
    except Exception as e:
        print(f"❌ Brand AI Error: {e}")
    return base

@app.post("/predict")
def predict(data: EventInput):
    if not (scaler and attendance_model and sponsor_model):
        raise HTTPException(status_code=500, detail="ML artifacts not loaded.")

    city = canonical_city(data.city)
    event_type = canonical_event_type(data.event_type)
    sponsor_category = canonical_brand_category(data.sponsor_category)

    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        month = dt.month
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0
    except Exception:
        month, day_of_week, is_weekend = 6, 5, 1

    temperature, humidity, is_raining = MP_WEATHER_DEFAULTS.get(month, (25, 60, 0))
    is_festive = 1 if month in FESTIVE_MONTHS else 0
    competing_events = competition_expected(city, is_weekend, is_festive)

    sponsor_amount = float(max(0.0, data.sponsor_amount))
    base_budget = BRAND_BUDGET_DEFAULTS.get(sponsor_category, 20_00_000)
    brand_annual_budget = max(base_budget, int(sponsor_amount * 5))

    organizer_rep = 0.55 if data.organizer_reputation is None else float(np.clip(data.organizer_reputation, 0.05, 0.97))
    lineup_q = 0.50 if data.lineup_quality is None else float(np.clip(data.lineup_quality, 0.05, 0.98))

    # ─────────────────────────────────────────────────────────────
    # 🧠 THE AGENTIC PRE-CHECK: Let Groq calculate Synergy
    # ─────────────────────────────────────────────────────────────
    dynamic_synergy = None
    if client is not None:
        try:
            sys_prompt = "You are an expert sponsorship evaluator. Output strictly JSON. No Markdown."
            user_prompt = f"""
            Brand: {data.brand_name} ({sponsor_category})
            Brand Context: {data.brand_description or 'None provided'}
            
            Event: {event_type} in {city}
            Event Context: {data.event_description or 'None provided'}
            
            Task: Calculate a synergy score from 0 to 100 based on audience alignment, brand fit, and thematic relevance. 
            Return ONLY valid JSON: {{"synergy_score": <integer>}}
            """
            comp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
                temperature=0.1,
                max_tokens=50
            )
            parsed = extract_json(comp.choices[0].message.content)
            if isinstance(parsed, dict) and "synergy_score" in parsed:
                dynamic_synergy = int(parsed["synergy_score"])
        except Exception as e:
            print(f"⚠️ Agentic Synergy Check Failed: {e}. Falling back to math.")

    # ─────────────────────────────────────────────────────────────
    # 🔄 REVERSE SCALING & SAFE FALLBACK
    # ─────────────────────────────────────────────────────────────
    if dynamic_synergy is not None:
        # Success! Groq provided the score.
        synergy_score = np.clip(dynamic_synergy, 0, 100)
        # Use Reverse-Scaler to convert it back for XGBoost
        fit_score = synergy_to_fit(synergy_score)
    else:
        # Fallback: API timed out, use the old hardcoded math
        fit_score = compute_fit_score(sponsor_category, event_type)
        synergy_score = fit_to_synergy(fit_score)


    brand_kpi = data.brand_kpi or "awareness"
    brand_city_focus = data.brand_city_focus or "all_mp"
    brand_activation_maturity = 0.55 if data.brand_activation_maturity is None else float(np.clip(data.brand_activation_maturity, 0.0, 1.0))

    x = pd.DataFrame(0.0, index=[0], columns=EXPECTED_COLUMNS)

    x.at[0, "month"] = month
    x.at[0, "day_of_week"] = day_of_week
    x.at[0, "is_weekend"] = is_weekend
    x.at[0, "is_festive"] = is_festive
    x.at[0, "is_indoor"] = 1 if data.is_indoor is None else int(data.is_indoor)
    x.at[0, "temperature"] = temperature
    x.at[0, "is_raining"] = is_raining
    x.at[0, "humidity"] = humidity

    x.at[0, "venue_capacity"] = float(max(0, data.venue_capacity))
    x.at[0, "ticket_price"] = float(max(0.0, data.price))
    x.at[0, "marketing_budget"] = float(max(0.0, data.marketing_budget))

    x.at[0, "organizer_reputation"] = organizer_rep
    x.at[0, "lineup_quality"] = lineup_q
    x.at[0, "social_media_reach"] = 15000.0 if data.social_media_reach is None else float(max(0, data.social_media_reach))
    x.at[0, "past_events_organized"] = 5.0 if data.past_events_organized is None else float(max(0, data.past_events_organized))

    x.at[0, "competing_events"] = float(competing_events)
    x.at[0, "brand_annual_budget"] = float(brand_annual_budget)
    x.at[0, "brand_activation_maturity"] = float(brand_activation_maturity)
    x.at[0, "fit_score"] = float(fit_score)
    x.at[0, "sponsor_amount"] = float(sponsor_amount)

    city_col = f"city_{city}"
    if city_col in x.columns:
        x.at[0, city_col] = 1.0

    event_col = f"event_type_{event_type}"
    if event_col in x.columns:
        x.at[0, event_col] = 1.0

    brand_col = f"brand_category_{sponsor_category}"
    if brand_col in x.columns:
        x.at[0, brand_col] = 1.0

    if brand_kpi == "hybrid" and "brand_kpi_hybrid" in x.columns:
        x.at[0, "brand_kpi_hybrid"] = 1.0
    elif brand_kpi == "leads" and "brand_kpi_leads" in x.columns:
        x.at[0, "brand_kpi_leads"] = 1.0
    elif brand_kpi == "sales" and "brand_kpi_sales" in x.columns:
        x.at[0, "brand_kpi_sales"] = 1.0

    if brand_city_focus == "metro" and "brand_city_focus_metro" in x.columns:
        x.at[0, "brand_city_focus_metro"] = 1.0
    elif brand_city_focus == "tier2" and "brand_city_focus_tier2" in x.columns:
        x.at[0, "brand_city_focus_tier2"] = 1.0
    elif brand_city_focus == "pilgrimage" and "brand_city_focus_pilgrimage" in x.columns:
        x.at[0, "brand_city_focus_pilgrimage"] = 1.0

    X_scaled = scaler.transform(x)

    pred_att_raw = float(attendance_model.predict(X_scaled)[0])
    capacity = int(max(1, data.venue_capacity))
    
    # Calculate how much demand there is relative to the size of the room
    demand_ratio = pred_att_raw / capacity

    if demand_ratio >= 1.4:
        # Demand is massive (140%+ of capacity). True 100% sell-out.
        predicted_attendance = capacity
    elif demand_ratio >= 1.0:
        # Demand meets capacity, but we factor in a realistic 5-10% no-show rate.
        # This scales the occupancy smoothly between 90% and 99%
        fill_factor = 0.90 + (0.09 * ((demand_ratio - 1.0) / 0.4))
        predicted_attendance = int(capacity * fill_factor)
    else:
        # Demand is lower than capacity. 
        predicted_attendance = int(pred_att_raw)

    # Final safety clip
    predicted_attendance = int(np.clip(predicted_attendance, 0, capacity))

    X_stage2 = np.column_stack((X_scaled, [pred_att_raw]))
    y_hat = int(sponsor_model.predict(X_stage2)[0])

    prob = None
    if hasattr(sponsor_model, "predict_proba"):
        try:
            prob = float(sponsor_model.predict_proba(X_stage2)[0][1])
        except Exception:
            prob = None

    cost_per_head = (sponsor_amount / predicted_attendance) if predicted_attendance > 0 else 0.0
    occupancy = (predicted_attendance / max(1, int(data.venue_capacity))) * 100.0

    band = prob_band(prob)
    prob_pct = None if prob is None else int(round(float(np.clip(prob, 0.0, 1.0)) * 100))
    verdict = f"{band['label']} ({prob_pct}%)" if prob_pct is not None else band["label"]

    recs = make_recommendations(
        predicted_attendance=predicted_attendance,
        sponsor_amount=sponsor_amount,
        marketing_budget=float(data.marketing_budget),
        cost_per_head=cost_per_head,
        competing_events=competing_events,
        organizer_rep=organizer_rep,
        lineup_q=lineup_q,
        synergy_score=int(synergy_score),
    )

    insights = generate_ai_insights(
        brand=data.brand_name,
        brand_description=data.brand_description,
        event_description=data.event_description,
        sponsor_category=sponsor_category,
        city=city,
        event_type=event_type,
        prob=prob,
        band_label=band["label"],
        synergy=int(synergy_score),
        predicted_attendance=predicted_attendance,
        occupancy=occupancy,
        cost_per_head=cost_per_head,
        competing_events=competing_events,
        roi_bucket_name=roi_bucket(cost_per_head),
        recommendations=recs,
    )

    ai_bundle = generate_ai_bundle(
        sponsor_category=sponsor_category,
        event_type=event_type,
        city=city,
        brand_name=data.brand_name,
        brand_description=data.brand_description,
        event_description=data.event_description,
        predicted_attendance=predicted_attendance,
        cost_per_head=cost_per_head,
        verdict_label=band["label"],
        prob=prob,
        competing_events=competing_events,
    )

    return {
        "normalized_input": {
            "city": city,
            "event_type": event_type,
            "sponsor_category": sponsor_category,
            "brand_kpi": brand_kpi,
            "brand_city_focus": brand_city_focus,
        },
        "attendance": predicted_attendance,
        "attendance_raw_model_output": round(pred_att_raw, 4),
        "ml_is_feasible": bool(y_hat == 1),
        "feasibility_probability": None if prob is None else round(prob, 4),

        "verdict": verdict,
        "verdict_band": band["tier"],
        "verdict_label": band["label"],

        "breakdown": {
            "occupancy_rate": round(occupancy, 1),
            "brand_synergy": int(synergy_score),
            "cost_per_head": round(cost_per_head, 2),
            "competing_events": int(competing_events),
        },

        "ai_insights": insights,
        "recommendations": recs,

        "ai_analysis": ai_bundle.get("analysis", ""),
        "negotiation_points": ai_bundle.get("negotiation_points", []),
        "cold_email": cold_email_to_string(ai_bundle.get("cold_email")),
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)