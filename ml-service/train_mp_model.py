import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

# 1. Load Data
try:
    df = pd.read_csv('mp_events_data.csv')
except FileNotFoundError:
    print("Error: Run generate_mp_data.py first!")
    exit()

# 2. Encode Text
le_city = LabelEncoder()
df['city'] = le_city.fit_transform(df['city'])

le_event = LabelEncoder()
df['event_type'] = le_event.fit_transform(df['event_type'])

# 3. Define Features (ADDED: venue_capacity)
X = df[['city', 'event_type', 'day_of_week', 'price', 'marketing_budget', 'venue_capacity', 'temperature', 'is_raining']]
y = df['attendance']

# 4. Train
print("Training Model with Capacity Logic...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

# 5. Save
artifacts = {
    "model": model,
    "le_city": le_city,
    "le_event": le_event
}
joblib.dump(artifacts, "mp_event_model.pkl")
print("Success! Model saved.")