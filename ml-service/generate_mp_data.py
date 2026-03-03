"""
generate_mp_data.py (LOCAL/REGIONAL MP calibrated)

Generates:
1) mp_sponsorwise_dataset.csv  (raw dataset with labels + leakage columns)
2) Prints feasible rate and basic stats

This version is tuned for LOCAL/REGIONAL sponsors in Madhya Pradesh so that:
- sponsorship asks are within realistic MP ranges (₹8k–₹7.5L typical)
- acceptance is probabilistic (pre-event decision), not strict thresholds
- overall feasible ratio is typically ~20–30% (adjustable via LOGIT_INTERCEPT)

Compatible with your existing preprocess.ipynb + train.ipynb:
- keeps the same column names, including leakage_cols used in preprocess.ipynb
"""

import numpy as np
import pandas as pd

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────
SEED = 42
NUM_BRANDS = 800
NUM_EVENTS = 10000
CANDIDATES_PER_EVENT = 7  # NUM_EVENTS * candidates ≈ 70,000 rows

OUT_CSV = "mp_sponsorwise_dataset.csv"

# Tuning knob: higher => more acceptances. For local/regional, aim ~0.20–0.30 feasible rate.
LOGIT_INTERCEPT = -0.35

rng = np.random.default_rng(SEED)

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))

def trunc_lognormal(median, sigma, low, high):
    """Sample lognormal with given median and sigma, clipped."""
    x = rng.lognormal(mean=np.log(max(1e-6, median)), sigma=sigma)
    return int(np.clip(x, low, high))

# ─────────────────────────────────────────────────────────────
# Cities (MP)
# ─────────────────────────────────────────────────────────────
CITIES = {
    "Indore":        {"pop_lakh": 35.0, "affluence": 0.70, "tourism": 0.30},
    "Bhopal":        {"pop_lakh": 28.0, "affluence": 0.65, "tourism": 0.35},
    "Jabalpur":      {"pop_lakh": 16.0, "affluence": 0.52, "tourism": 0.35},
    "Gwalior":       {"pop_lakh": 12.0, "affluence": 0.50, "tourism": 0.30},
    "Ujjain":        {"pop_lakh": 6.5,  "affluence": 0.40, "tourism": 0.85},
    "Sagar":         {"pop_lakh": 4.0,  "affluence": 0.36, "tourism": 0.30},
    "Dewas":         {"pop_lakh": 3.5,  "affluence": 0.34, "tourism": 0.25},
    "Satna":         {"pop_lakh": 3.5,  "affluence": 0.33, "tourism": 0.30},
    "Rewa":          {"pop_lakh": 2.8,  "affluence": 0.32, "tourism": 0.28},
    "Ratlam":        {"pop_lakh": 3.0,  "affluence": 0.34, "tourism": 0.25},
    "Katni":         {"pop_lakh": 2.5,  "affluence": 0.30, "tourism": 0.22},
    "Chhindwara":    {"pop_lakh": 2.0,  "affluence": 0.28, "tourism": 0.25},
    "Khandwa":       {"pop_lakh": 2.5,  "affluence": 0.30, "tourism": 0.24},
    "Burhanpur":     {"pop_lakh": 2.2,  "affluence": 0.29, "tourism": 0.23},
    "Morena":        {"pop_lakh": 2.5,  "affluence": 0.30, "tourism": 0.22},
    "Singrauli":     {"pop_lakh": 2.8,  "affluence": 0.31, "tourism": 0.20},
    "Vidisha":       {"pop_lakh": 2.0,  "affluence": 0.28, "tourism": 0.22},
    "Narmadapuram":  {"pop_lakh": 1.8,  "affluence": 0.27, "tourism": 0.26},
    "Shivpuri":      {"pop_lakh": 1.8,  "affluence": 0.27, "tourism": 0.21},
    "Damoh":         {"pop_lakh": 1.5,  "affluence": 0.25, "tourism": 0.20},
    "Sehore":        {"pop_lakh": 1.5,  "affluence": 0.25, "tourism": 0.20},
    "Seoni":         {"pop_lakh": 1.3,  "affluence": 0.24, "tourism": 0.22},
    "Neemuch":       {"pop_lakh": 1.3,  "affluence": 0.24, "tourism": 0.18},
    "Mandsaur":      {"pop_lakh": 1.5,  "affluence": 0.25, "tourism": 0.20},
    "Khargone":      {"pop_lakh": 1.8,  "affluence": 0.27, "tourism": 0.20},
}

city_names = list(CITIES.keys())
city_weights = np.array([CITIES[c]["pop_lakh"] for c in city_names], dtype=float)
city_weights = city_weights / city_weights.sum()

# ─────────────────────────────────────────────────────────────
# Event types
# ─────────────────────────────────────────────────────────────
EVENT_TYPES = {
    "Music Concert":       {"indoor_prob": 0.55, "cap_range": (800, 60000), "price_range": (99, 1999),  "tags": ["youth", "family"]},
    "Food Festival":       {"indoor_prob": 0.30, "cap_range": (600, 30000), "price_range": (0, 499),     "tags": ["family", "mass"]},
    "Religious/Cultural":  {"indoor_prob": 0.20, "cap_range": (700, 80000), "price_range": (0, 299),     "tags": ["family", "mass"]},
    "Cricket Screening":   {"indoor_prob": 0.35, "cap_range": (300, 20000), "price_range": (0, 399),     "tags": ["mass", "youth"]},
    "Standup Comedy":      {"indoor_prob": 0.75, "cap_range": (200, 10000), "price_range": (199, 2499),  "tags": ["youth"]},
    "Tech Meetup":         {"indoor_prob": 0.95, "cap_range": (80, 4000),   "price_range": (0, 999),     "tags": ["youth", "professional"]},
    "College Fest":        {"indoor_prob": 0.40, "cap_range": (500, 45000), "price_range": (0, 299),     "tags": ["youth"]},
    "Sports Tournament":   {"indoor_prob": 0.20, "cap_range": (600, 50000), "price_range": (0, 499),     "tags": ["youth", "mass"]},
    "Business Conference": {"indoor_prob": 0.98, "cap_range": (120, 12000), "price_range": (999, 9999),  "tags": ["professional"]},
}

event_type_names = list(EVENT_TYPES.keys())
event_type_weights = np.array([0.15, 0.15, 0.14, 0.10, 0.08, 0.08, 0.14, 0.11, 0.05], dtype=float)
event_type_weights = event_type_weights / event_type_weights.sum()

# ─────────────────────────────────────────────────────────────
# Weather + festivals
# ─────────────────────────────────────────────────────────────
MP_WEATHER_DEFAULTS = {
    1:  (17, 55, 0), 2:  (20, 45, 0), 3:  (26, 32, 0),
    4:  (32, 25, 0), 5:  (36, 28, 0), 6:  (34, 58, 1),
    7:  (28, 82, 1), 8:  (27, 85, 1), 9:  (28, 78, 0),
    10: (27, 58, 0), 11: (22, 52, 0), 12: (18, 55, 0),
}
FESTIVE_MONTHS = {1, 2, 3, 4, 8, 9, 10, 11, 12}

def get_weather(month: int):
    t, h, r = MP_WEATHER_DEFAULTS.get(month, (25, 60, 0))
    t = float(np.clip(rng.normal(t, 2.2), 10, 45))
    h = float(np.clip(rng.normal(h, 8.0), 15, 95))
    if month in (6, 7, 8):
        r = int(rng.random() < 0.72)
    else:
        r = int(rng.random() < (0.10 if r == 0 else 0.25))
    return t, r, h

def get_festival_boost(month: int, event_type: str, city: str):
    if month in FESTIVE_MONTHS and event_type in ("Religious/Cultural", "Food Festival", "Music Concert"):
        base = 1.10 + 0.25 * CITIES[city]["tourism"]
        brand_boost = 0.06 + 0.10 * CITIES[city]["tourism"]
        return base, brand_boost, "festive"
    return 1.0, 0.0, "none"

def competing_events_expected(city: str, is_weekend: int, is_festive: int) -> int:
    pop = float(CITIES[city]["pop_lakh"])
    lam = 0.8 + 0.08 * pop
    if is_weekend:
        lam *= 1.6
    if is_festive:
        lam *= 1.4
    return int(np.clip(rng.poisson(lam=lam), 0, 25))

# ─────────────────────────────────────────────────────────────
# Brand categories (local/regional)
# ─────────────────────────────────────────────────────────────
BRAND_CATS = {
    "Automobile":           {"budget_median": 40_00_000, "budget_sigma": 0.65, "aud": ["mass", "professional"], "aff": ["Sports Tournament", "Cricket Screening", "Business Conference", "Music Concert"]},
    "Telecom":              {"budget_median": 38_00_000, "budget_sigma": 0.70, "aud": ["mass", "youth"], "aff": ["Music Concert", "Cricket Screening", "College Fest", "Food Festival", "Religious/Cultural"]},
    "Real Estate":          {"budget_median": 30_00_000, "budget_sigma": 0.75, "aud": ["professional", "family"], "aff": ["Business Conference", "Cricket Screening", "Religious/Cultural"]},
    "FMCG":                 {"budget_median": 22_00_000, "budget_sigma": 0.70, "aud": ["mass", "family"], "aff": ["Food Festival", "Cricket Screening", "Religious/Cultural", "College Fest"]},
    "Beverage":             {"budget_median": 20_00_000, "budget_sigma": 0.70, "aud": ["mass", "youth", "family"], "aff": ["Music Concert", "Food Festival", "Cricket Screening", "College Fest", "Sports Tournament"]},
    "Fintech":              {"budget_median": 18_00_000, "budget_sigma": 0.80, "aud": ["youth", "professional"], "aff": ["Tech Meetup", "Business Conference", "College Fest"]},
    "Edtech":               {"budget_median": 14_00_000, "budget_sigma": 0.80, "aud": ["youth"], "aff": ["Tech Meetup", "College Fest"]},
    "Apparel":              {"budget_median": 12_00_000, "budget_sigma": 0.85, "aud": ["youth", "family"], "aff": ["Music Concert", "College Fest", "Standup Comedy", "Food Festival"]},
    "Beauty/Personal Care": {"budget_median": 10_00_000, "budget_sigma": 0.85, "aud": ["youth", "family"], "aff": ["Music Concert", "College Fest", "Food Festival"]},
    "Local Retail":         {"budget_median": 6_00_000,  "budget_sigma": 0.90, "aud": ["mass", "family"], "aff": ["Religious/Cultural", "Food Festival", "Sports Tournament", "Cricket Screening"]},
}
brand_cat_names = list(BRAND_CATS.keys())

def brand_event_fit(brand_cat: str, event_type: str, event_tags, city_name: str, brand_city_focus: str) -> float:
    bc = BRAND_CATS[brand_cat]
    type_match = 1.0 if event_type in bc["aff"] else 0.55
    overlap = len(set(bc["aud"]).intersection(set(event_tags)))
    aud_score = {0: 0.50, 1: 0.82, 2: 1.05}.get(overlap, 1.10)

    cp = CITIES[city_name]
    if brand_city_focus == "metro":
        city_fit = 0.60 + 0.40 * (cp["pop_lakh"] / 35.0)
    elif brand_city_focus == "tier2":
        city_fit = 0.80 + 0.20 * min(1.0, cp["pop_lakh"] / 15.0)
    elif brand_city_focus == "pilgrimage":
        city_fit = 0.70 + 0.40 * cp["tourism"]
    else:
        city_fit = 0.95

    return float(np.clip(type_match * aud_score * city_fit, 0.25, 1.60))

def kpi_value(kpi, impressions, attendance, fit, activation):
    """LOCAL/REGIONAL benchmarks (offline + digital blended). Returns INR value."""
    fit = float(np.clip(fit, 0.25, 1.6))
    activation = float(np.clip(activation, 0.05, 0.97))

    if kpi == "awareness":
        cpm_val = 45 + 85 * fit + 20 * activation
        return (impressions / 1000.0) * cpm_val

    if kpi == "leads":
        lead_rate = 0.025 + 0.09 * fit * activation
        lead_val = 220 + 380 * fit
        return attendance * lead_rate * lead_val

    if kpi == "sales":
        buy_rate = 0.008 + 0.045 * fit * activation
        txn_val = 250 + 300 * activation
        return attendance * buy_rate * txn_val

    a_val = (impressions / 1000.0) * (35 + 65 * fit + 15 * activation)
    l_val = attendance * (0.02 + 0.07 * fit * activation) * (200 + 300 * fit)
    return 0.55 * a_val + 0.45 * l_val

# ─────────────────────────────────────────────────────────────
# Generate brands
# ─────────────────────────────────────────────────────────────
print("Generating brands...")
brand_rows = []
for bid in range(1, NUM_BRANDS + 1):
    cat = rng.choice(brand_cat_names)
    bc = BRAND_CATS[cat]
    city_focus = rng.choice(["all_mp", "metro", "tier2", "pilgrimage"], p=[0.50, 0.28, 0.14, 0.08])

    annual_budget = int(np.clip(
        rng.lognormal(np.log(bc["budget_median"]), bc["budget_sigma"]),
        2_00_000,
        3_00_00_000
    ))

    if cat in ("Fintech", "Edtech", "Automobile", "Real Estate"):
        kpi = rng.choice(["leads", "hybrid"], p=[0.55, 0.45])
    elif cat in ("Local Retail",):
        kpi = rng.choice(["sales", "hybrid"], p=[0.60, 0.40])
    else:
        kpi = rng.choice(["awareness", "hybrid", "leads"], p=[0.52, 0.35, 0.13])

    activation_maturity = float(np.clip(rng.normal(0.55, 0.18), 0.08, 0.95))

    brand_rows.append(dict(
        brand_id=bid,
        brand_category=cat,
        brand_city_focus=city_focus,
        brand_kpi=kpi,
        brand_annual_budget=annual_budget,
        brand_activation_maturity=round(activation_maturity, 3),
    ))

brands_df = pd.DataFrame(brand_rows)

# ─────────────────────────────────────────────────────────────
# Generate events + sponsorship pairs
# ─────────────────────────────────────────────────────────────
print("Generating events + sponsorship pairs...")
all_rows = []

for eid in range(1, NUM_EVENTS + 1):
    if eid % 2000 == 0:
        print(f"  ...{eid}/{NUM_EVENTS}")

    city = rng.choice(city_names, p=city_weights)
    cp = CITIES[city]
    event_type = rng.choice(event_type_names, p=event_type_weights)
    et = EVENT_TYPES[event_type]

    month = int(rng.integers(1, 13))
    day_of_week = int(rng.integers(0, 7))
    is_weekend = int(day_of_week >= 5)

    temperature, is_raining, humidity = get_weather(month)
    fest_boost, brand_act_boost, festival_name = get_festival_boost(month, event_type, city)
    is_festive = int(festival_name != "none")

    is_indoor = int(rng.random() < et["indoor_prob"])
    cap_lo, cap_hi = et["cap_range"]
    cap_scale = 0.70 + 0.60 * (cp["pop_lakh"] / 35.0)
    cap_median = max(cap_lo, (cap_lo + cap_hi) / 2 * cap_scale)
    venue_capacity = trunc_lognormal(cap_median, 0.50, cap_lo, cap_hi)

    org_rep = float(np.clip(rng.normal(0.52, 0.20), 0.05, 0.97))
    lineup_q = float(np.clip(rng.normal(0.48 + 0.30 * org_rep, 0.18), 0.05, 0.98))

    social_reach = int(np.clip(
        rng.lognormal(np.log(max(500, 3000 * org_rep * cp["pop_lakh"] / 10)), 0.80),
        100,
        5_00_000
    ))
    past_events = int(np.clip(rng.poisson(lam=3 + 15 * org_rep), 0, 80))

    p_lo, p_hi = et["price_range"]
    if p_lo >= p_hi:
        price = p_lo
    else:
        if event_type in ("Music Concert", "Business Conference"):
            price = int(np.clip(rng.normal((p_lo + p_hi) / 2, (p_hi - p_lo) / 5), p_lo, p_hi))
        else:
            price = int(np.clip(rng.normal((p_lo + p_hi) / 3, (p_hi - p_lo) / 6), p_lo, p_hi))

    marketing_budget = int(np.clip(
        rng.lognormal(np.log(12000 + 6000 * org_rep + 4000 * cp["affluence"]), 0.90),
        2000,
        12_00_000
    ))

    comp = competing_events_expected(city, is_weekend, is_festive)

    weather_factor = 0.85 if (is_raining and not is_indoor) else 1.0
    heat_penalty = 0.90 if (temperature >= 40 and not is_indoor) else 1.0
    weekend_boost = 1.12 if is_weekend else 1.0
    competition_penalty = 1.0 - 0.015 * min(comp, 20)

    base_att_rate = 0.22 + 0.50 * org_rep + 0.22 * lineup_q + 0.12 * cp["tourism"]
    base_att_rate *= weekend_boost * weather_factor * heat_penalty * competition_penalty * fest_boost
    base_att_rate = float(np.clip(base_att_rate, 0.05, 1.05))

    pred_att = venue_capacity * base_att_rate

    noise = float(np.clip(rng.normal(1.0, 0.16), 0.55, 1.35))
    if rng.random() < 0.05:
        shock = rng.choice(["rain_surprise", "traffic", "viral", "cancel"])
        if shock == "rain_surprise" and not is_indoor:
            noise *= 0.62
        elif shock == "traffic":
            noise *= 0.78
        elif shock == "viral":
            noise *= 1.28
        elif shock == "cancel" and event_type in ("Music Concert", "Standup Comedy"):
            noise *= 0.48

    actual_att = int(np.clip(pred_att * noise, 0, venue_capacity))
    pred_att_int = int(pred_att)
    pred_att_rate = float(pred_att / max(1, venue_capacity))
    act_att_rate = float(actual_att / max(1, venue_capacity))

    crowding = act_att_rate
    rating = (3.10 + 1.25 * lineup_q + 0.85 * org_rep
              - 0.50 * max(0, crowding - 0.93)
              - 0.30 * max(0, 0.25 - crowding))
    if (not is_indoor) and (temperature >= 40 or is_raining):
        rating -= 0.30
    if is_festive and event_type in ("Religious/Cultural", "Music Concert", "Food Festival"):
        rating += 0.15
    rating = round(float(np.clip(rating + rng.normal(0, 0.20), 1.0, 5.0)), 2)

    event_success = int(
        (act_att_rate >= 0.52 and rating >= 3.75) or
        (act_att_rate >= 0.70 and rating >= 3.40) or
        (act_att_rate >= 0.40 and rating >= 4.20)
    )

    cand_ids = rng.choice(brands_df["brand_id"].values, size=min(CANDIDATES_PER_EVENT, NUM_BRANDS), replace=False)

    for brand_id in cand_ids:
        b = brands_df.loc[brands_df["brand_id"] == brand_id].iloc[0]
        fit = brand_event_fit(b["brand_category"], event_type, et["tags"], city, b["brand_city_focus"])

        # Sponsor ask (LOCAL/REGIONAL MP realistic)
        city_aff = cp["affluence"]
        event_premium = 1.15 if event_type in ("Music Concert", "Sports Tournament") else 1.0
        base_amt = (9000 + 16 * venue_capacity) * (0.60 + 0.85 * fit) * (0.70 + 0.55 * city_aff) * event_premium
        base_amt *= max(0.35, rng.normal(1.0, 0.28))

        sponsor_amount = int(np.clip(base_amt, 8000, 7_50_000))
        sponsor_amount = min(sponsor_amount, max(8000, int(0.12 * b["brand_annual_budget"])))

        maturity = float(b["brand_activation_maturity"])
        act_q = float(np.clip(
            0.30 + 0.38 * maturity + 0.15 * np.log1p(sponsor_amount / 25000.0) + brand_act_boost + rng.normal(0, 0.07),
            0.05, 0.97
        ))

        pred_imp = pred_att * 3.0 * (0.70 + 0.60 * act_q)
        pred_imp += (marketing_budget / 30.0) * (0.45 + 0.70 * act_q)
        pred_imp += social_reach * (0.15 + 0.30 * act_q) * (0.80 + 0.40 * fit)
        pred_imp = float(np.clip(pred_imp, 200, 1e8))

        act_imp = actual_att * float(np.clip(rng.normal(3.0, 0.6), 1.5, 5.5)) * (0.70 + 0.60 * act_q)
        act_imp += (marketing_budget / 30.0) * (0.45 + 0.70 * act_q)
        act_imp += social_reach * (0.15 + 0.30 * act_q) * (0.80 + 0.40 * fit)
        act_imp = float(np.clip(act_imp, 200, 1e8))

        clutter_index = float(np.clip(rng.normal(0.30 + 0.04 * comp, 0.10), 0.0, 0.85))

        lift = (0.50 + 2.70 * fit + 1.50 * np.log1p(act_imp / 50000.0) + 1.05 * act_q - 1.80 * clutter_index)
        if rating < 3.3:
            lift *= 0.72
        if event_success:
            lift *= 1.08
        brand_lift = round(float(np.clip(lift + rng.normal(0, 0.30), 0.0, 10.0)), 3)

        # Sponsor decision based on PRE-EVENT expectations:
        exp_value = kpi_value(b["brand_kpi"], pred_imp, pred_att_int, fit, act_q)
        exp_roi = float((exp_value - sponsor_amount) / max(1.0, sponsor_amount))

        ask_ratio = float(sponsor_amount / max(1.0, b["brand_annual_budget"]))
        clutter = float(np.clip(comp / 12.0, 0.0, 1.0))
        weather_penalty = 0.20 if (is_raining == 1 and not is_indoor) else 0.0

        risk = float(np.clip(
            0.35 * (1 - org_rep) +
            0.25 * (1 - maturity) +
            0.20 * (1 - pred_att_rate) +
            0.20 * clutter +
            weather_penalty,
            0.0, 1.0
        ))

        logit = (
            LOGIT_INTERCEPT
            + 2.10 * exp_roi
            + 1.25 * (fit - 0.50)
            + 0.75 * (act_q - 0.50)
            + 0.55 * (org_rep - 0.50)
            - 3.50 * max(0.0, ask_ratio - 0.08)
            - 1.10 * risk
            + 0.18 * is_festive
            + 0.10 * is_weekend
        )

        p_accept = sigmoid(logit)

        if rng.random() < 0.12:
            p_accept *= 0.80

        feasible = int(rng.random() < p_accept)

        if rng.random() < 0.02:
            feasible = 1 - feasible

        roi = round(exp_roi, 4)

        all_rows.append({
            "event_id": eid,
            "brand_id": int(brand_id),

            "state": "Madhya Pradesh",
            "city": city,

            "event_type": event_type,
            "month": month,
            "day_of_week": day_of_week,
            "is_weekend": int(is_weekend),
            "is_festive": int(is_festive),
            "festival_name": festival_name,

            "is_indoor": int(is_indoor),
            "temperature": round(float(temperature), 2),
            "is_raining": int(is_raining),
            "humidity": round(float(humidity), 2),

            "venue_capacity": int(venue_capacity),
            "ticket_price": int(price),
            "marketing_budget": int(marketing_budget),

            "organizer_reputation": round(float(org_rep), 3),
            "lineup_quality": round(float(lineup_q), 3),

            "social_media_reach": int(social_reach),
            "past_events_organized": int(past_events),
            "competing_events": int(comp),

            "predicted_attendance": int(pred_att_int),
            "predicted_attendance_rate": round(float(pred_att_rate), 4),
            "predicted_impressions": int(pred_imp),

            "actual_attendance": int(actual_att),
            "actual_attendance_rate": round(float(act_att_rate), 4),
            "event_rating": float(rating),
            "event_success": int(event_success),

            "brand_category": str(b["brand_category"]),
            "brand_kpi": str(b["brand_kpi"]),
            "brand_city_focus": str(b["brand_city_focus"]),
            "brand_annual_budget": int(b["brand_annual_budget"]),
            "brand_activation_maturity": float(b["brand_activation_maturity"]),

            "fit_score": round(float(fit), 4),
            "sponsor_amount": int(sponsor_amount),
            "activation_quality": round(float(act_q), 4),
            "clutter_index": round(float(clutter_index), 4),

            "brand_lift": float(brand_lift),
            "roi": float(roi),
            "feasible_to_sponsor": int(feasible),
        })

df = pd.DataFrame(all_rows)
df.to_csv(OUT_CSV, index=False)

feasible_rate = float(df["feasible_to_sponsor"].mean())
print(f"✅ Saved {OUT_CSV} with shape={df.shape}")
print(f"✅ feasible_to_sponsor rate = {feasible_rate:.4f} ({feasible_rate*100:.1f}%)")
print(df["sponsor_amount"].describe(percentiles=[0.1,0.25,0.5,0.75,0.9]).to_string())