import pandas as pd
import numpy as np
import random

# CONFIGURATION
NUM_EVENTS = 6000
OUTPUT_FILE = "mp_events_data.csv"

CITIES = ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Satna", "Rewa"]
EVENT_TYPES = ["Cricket Screening", "Religious/Cultural", "Tech Meetup", "Standup Comedy", "Music Concert", "Food Festival"]

print("Generating 'Balanced Success' Data...")

data = []

for _ in range(NUM_EVENTS):
    city = random.choice(CITIES)
    event_type = random.choice(EVENT_TYPES)
    day_of_week = random.randint(0, 6) # 5,6 = Weekend
    
    # --- 1. REALISTIC CAPACITIES ---
    if event_type == "Music Concert": venue_capacity = random.randint(2000, 15000)
    elif event_type == "Food Festival": venue_capacity = random.randint(1000, 5000)
    elif event_type == "Cricket Screening": venue_capacity = random.randint(100, 500)
    else: venue_capacity = random.randint(50, 300)

    # --- 2. LOGIC: BASE DEMAND (ORGANIC CROWD) ---
    # Before marketing, how many people just "show up"?
    
    # High Demand Events (Concerts, Food, Religious)
    if event_type in ["Music Concert", "Food Festival", "Religious/Cultural"]:
        # They naturally get 30% to 70% full even with low effort
        base_occupancy = random.uniform(0.30, 0.70)
    
    # Niche Events (Tech, Standup)
    else:
        # They naturally get 10% to 40% full
        base_occupancy = random.uniform(0.10, 0.40)
        
    # Apply City Boost (Indore/Bhopal are busier)
    if city in ["Indore", "Bhopal"]: base_occupancy += 0.10
    
    # Weekend Boost
    if day_of_week >= 5: base_occupancy += 0.15

    # Calculate Organic Walk-ins
    organic_demand = int(venue_capacity * base_occupancy)

    # --- 3. MARKETING BOOST (Adds to Organic) ---
    marketing_budget = random.randint(0, 100000)
    
    # Cost per acquisition (CPA) assumption: 
    # It costs roughly ₹200-₹500 to buy a visitor via ads
    marketing_driven_visitors = int(marketing_budget / random.randint(150, 400))
    
    # --- 4. PRICE FRICTION (Reduces Total) ---
    if event_type == "Music Concert": price = random.randint(500, 5000)
    elif event_type == "Tech Meetup": price = random.randint(0, 500)
    else: price = random.randint(50, 1000)
    
    price_penalty = 1.0
    # Only penalize if price is OUTRAGEOUS for that category
    if event_type == "Food Festival" and price > 500: price_penalty = 0.5
    elif event_type == "Tech Meetup" and price > 300: price_penalty = 0.2
    elif event_type == "Music Concert" and price > 5000: price_penalty = 0.6
    
    # --- FINAL CALCULATION ---
    total_demand = (organic_demand + marketing_driven_visitors) * price_penalty
    
    # Weather check (Summer afternoons kill outdoor events)
    temp = random.randint(15, 45)
    raining = 0
    if temp > 40: total_demand *= 0.6 # 40% drop, not 90%
    
    attendance = int(min(total_demand, venue_capacity))
    
    data.append([city, event_type, day_of_week, price, marketing_budget, venue_capacity, temp, raining, attendance])

df = pd.DataFrame(data, columns=['city', 'event_type', 'day_of_week', 'price', 'marketing_budget', 'venue_capacity', 'temperature', 'is_raining', 'attendance'])
df.to_csv(OUTPUT_FILE, index=False)
print(f"Success. Generated {NUM_EVENTS} events.")