from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import uvicorn
import json
import re
import random
from dotenv import load_dotenv
from groq import Groq
import os

app = FastAPI()
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

try:
    artifacts = joblib.load("mp_event_model.pkl")
    model = artifacts["model"]
    le_city = artifacts["le_city"]
    le_event = artifacts["le_event"]
except:
    pass

class BrandInput(BaseModel):
    company_name: str
    industry: str

class EventInput(BaseModel):
    city: str
    event_type: str
    sponsor_category: str
    day_of_week: int
    price: float
    marketing_budget: float
    venue_capacity: int
    temperature: float
    is_raining: int

# --- LOGIC BRAIN: TIPS GENERATOR ---
def generate_smart_tips(data, attendance, cost_per_head, occupancy, roi_score):
    tips = []
    
    # 1. Occupancy Tips
    if occupancy < 40:
        tips.append("📢 Low Turnout Risk: Occupancy is below 40%. Consider reducing ticket price by 20% to drive volume.")
    elif occupancy >= 40 and occupancy < 75:
        tips.append("📈 Growth Potential: You have room to grow. A small boost in ad spend (₹2-5k) could fill the remaining seats.")
    elif occupancy >= 75 and occupancy < 95:
        tips.append("✅ Healthy Crowd: You are in the 'Sweet Spot' (75-95% full). Focus on maximizing onsite F&B revenue.")
    else:
        tips.append("🔥 Capacity Alert: You are effectively sold out. Next time, book a larger venue or raise ticket prices by 30%.")

    # 2. Financial Tips
    if roi_score < 40:
        tips.append("💰 Cost Warning: Your sponsorship ask is too high for this crowd size. Lower it by 25% to close the deal.")
    elif roi_score > 90:
        tips.append("💎 Undervalued Asset: Your Cost Per Reach is extremely low. You could easily ask for 50% more money.")
    else:
        tips.append("⚖️ Fair Value: Your pricing is competitive. Emphasize audience quality in your pitch.")

    # 3. Context Tips (Day/Weather/City)
    if data.day_of_week not in [5, 6] and data.event_type == "Food Festival":
        tips.append("📅 Timing Hack: Moving this Food Festival to a Weekend would likely boost attendance by ~40%.")
    elif data.city in ["Indore", "Bhopal"] and occupancy > 60:
        tips.append(f"🏙️ Location Advantage: {data.city} shows strong affinity for {data.event_type}s, boosting your baseline crowd.")
    else:
        tips.append("🎯 Audience Match: Ensure your sponsor's booth is placed in a high-traffic zone.")

    return tips[:3]

# --- LOGIC BRAIN: RICH TEXT GENERATOR ---
def generate_rich_analysis(data, attendance, cost, roi, occupancy):
    # This runs if AI fails. It constructs a paragraph from logic blocks.
    
    # Sentence 1: Performance Summary
    if occupancy > 80:
        s1 = f"This event is projected to be a major success with {attendance} attendees, utilizing {int(occupancy)}% of venue capacity. "
    elif occupancy > 50:
        s1 = f"The event shows stable traction with {attendance} attendees, representing a solid {int(occupancy)}% occupancy. "
    else:
        s1 = f"The event currently faces traction challenges, with projections showing only {attendance} attendees ({int(occupancy)}% full). "

    # Sentence 2: Financial Efficiency
    if roi > 75:
        s2 = f"At ₹{cost:.2f} per person, the acquisition cost is highly efficient, offering the sponsor exceptional value for money. "
    elif roi > 40:
        s2 = f"The cost of ₹{cost:.2f} per head aligns well with industry standards for {data.city}, making it a viable commercial proposition. "
    else:
        s2 = f"However, the cost of ₹{cost:.2f} per head is on the higher side, which might deter budget-conscious sponsors. "

    # Sentence 3: Strategic Verdict
    if data.sponsor_category in ["FMCG (Food/Bev)", "Tech / SaaS"]:
        s3 = f"Given the {data.sponsor_category} focus, the audience demographic is a natural fit, increasing the effective ROI."
    else:
        s3 = "To maximize success, focus on onsite engagement to compensate for any gaps in direct brand alignment."

    return s1 + s2 + s3

@app.post("/analyze-brand")
def analyze_brand_inference(data: BrandInput):
    # Fast Inference
    ai_analysis = {
        "target_audience": "General Audience", "core_values": "Growth", "persona": "Challenger",
        "high_synergy": ["Conferences", "Expos"], "strategy_statement": "Maximize visibility."
    }
    return ai_analysis

@app.post("/predict")
def predict_sponsorship_final(data: EventInput):
    # 1. BASELINE PREDICTION
    try:
        city_enc = le_city.transform([data.city])[0]
        event_enc = le_event.transform([data.event_type])[0]
        features = pd.DataFrame([[
            city_enc, event_enc, data.day_of_week, 
            data.price, data.marketing_budget, 
            data.venue_capacity, 
            data.temperature, data.is_raining
        ]], columns=['city', 'event_type', 'day_of_week', 'price', 'marketing_budget', 'venue_capacity', 'temperature', 'is_raining'])
        base_attendance = int(model.predict(features)[0])
    except:
        base_attendance = int(data.venue_capacity * 0.4)

    # 2. FACTORS EXPLANATION (Why this number?)
    factors = []
    
    # City Factor
    city_map = {"Indore": 1.2, "Bhopal": 1.1, "Gwalior": 0.9}
    city_mult = city_map.get(data.city, 0.8)
    if city_mult > 1.0: factors.append(f"🏙️ {data.city} Boost (+{int((city_mult-1)*100)}%)")
    
    # Day Factor
    day_mult = 1.0
    if data.event_type in ["Food Festival", "Music Concert"]:
        is_weekend = data.day_of_week in [0, 5, 6]
        day_mult = 1.4 if is_weekend else 0.6
        factors.append("📅 Weekend Surge (+40%)" if is_weekend else "📅 Weekday Drag (-40%)")
    
    # Apply Factors
    predicted_attendance = int(base_attendance * city_mult * day_mult)
    predicted_attendance = max(10, min(predicted_attendance, data.venue_capacity))

    # 3. METRICS
    cost_per_head = data.marketing_budget / predicted_attendance if predicted_attendance > 0 else 0
    occupancy = (predicted_attendance / data.venue_capacity) * 100
    
    acceptable_cost = 50 + (data.price * 0.2)
    if cost_per_head <= 1: roi_score = 100
    elif cost_per_head <= acceptable_cost:
        roi_score = 60 + ((acceptable_cost - cost_per_head)/acceptable_cost * 40)
    else:
        roi_score = max(0, 60 - ((cost_per_head - acceptable_cost) * 0.5))

    # 4. GENERATE CONTENT (AI or Logic)
    day_name = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][data.day_of_week]
    
    prompt = f"""
    Act as a Consultant. 
    Analyze: {data.sponsor_category} sponsoring {data.event_type} ({data.city}, {day_name}).
    Data: {predicted_attendance}/{data.venue_capacity} ppl. Cost ₹{cost_per_head:.2f}/head.
    Output JSON: "fit_score", "analysis" (3 sentences), "verdict" (2 words).
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192", messages=[{"role": "user", "content": prompt}], temperature=0.5, max_tokens=400
        )
        clean = re.sub(r'<think>.*?</think>', '', completion.choices[0].message.content, flags=re.DOTALL).replace("```json", "").replace("```", "").strip()
        ai_resp = json.loads(clean)
        analysis_text = ai_resp.get("analysis")
        verdict = ai_resp.get("verdict").upper()
    except:
        # FALLBACK: Use Logic Generator
        analysis_text = generate_rich_analysis(data, predicted_attendance, cost_per_head, roi_score, occupancy)
        verdict = "HIGH POTENTIAL" if roi_score > 75 else "MODERATE" if roi_score > 40 else "HIGH RISK"
        ai_resp = {"fit_score": 50}

    # 5. TIPS & SCORE
    tips = generate_smart_tips(data, predicted_attendance, cost_per_head, occupancy, roi_score)
    final_score = int((ai_resp.get("fit_score", 50)*0.3) + (roi_score*0.5) + (occupancy*0.2))

    return {
        "attendance": predicted_attendance,
        "final_score": min(final_score, 99),
        "breakdown": {
            "audience_score": int(occupancy),
            "brand_fit_score": int(ai_resp.get("fit_score", 50)),
            "cost_score": int(roi_score),
            "cost_per_head": round(cost_per_head, 2)
        },
        "factors": factors, # NEW: Why the crowd number is what it is
        "tips": tips,
        "ai_analysis": analysis_text,
        "verdict": verdict
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)