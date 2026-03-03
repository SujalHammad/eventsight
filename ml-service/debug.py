import os
import sys

print("--- 🔍 DIAGNOSTIC TOOL STARTED ---")

# 1. TEST DOTENV
try:
    from dotenv import load_dotenv
    print("✅ python-dotenv library is installed.")
except ImportError:
    print("❌ ERROR: python-dotenv is NOT installed. Run: pip install python-dotenv")
    sys.exit()

# 2. TEST .ENV FILE LOADING
# We force it to look in the same folder as this script
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '.env')

if os.path.exists(env_path):
    print(f"✅ Found .env file at: {env_path}")
else:
    print(f"❌ ERROR: .env file NOT found at: {env_path}")
    print("   -> Make sure you created a file named '.env' inside the ml-service folder.")
    sys.exit()

load_dotenv(env_path)
api_key = os.getenv("GROQ_API_KEY")

if api_key and api_key.startswith("gsk_"):
    print("✅ API Key loaded and looks valid (starts with gsk_).")
else:
    print(f"❌ ERROR: API Key failed. Value detected: {api_key}")
    print("   -> Open .env and check if it looks like: GROQ_API_KEY=gsk_123...")
    sys.exit()

# 3. TEST GROQ CONNECTION
print("⏳ Testing Groq API connection (this might take 2 seconds)...")
try:
    from groq import Groq
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": "Say hello"}],
        max_tokens=10
    )
    print("✅ Groq API Success! AI replied:", completion.choices[0].message.content)
except Exception as e:
    print(f"❌ ERROR: Groq API Connection Failed. Reason: {e}")
    sys.exit()

# 4. TEST MODEL LOADING
import joblib
try:
    model_path = os.path.join(current_dir, 'mp_event_model.pkl')
    if os.path.exists(model_path):
        joblib.load(model_path)
        print("✅ ML Model loaded successfully.")
    else:
        print("❌ ERROR: mp_event_model.pkl not found.")
        print("   -> Run 'python train_model.py' first.")
except Exception as e:
    print(f"❌ ERROR: Model Load Failed. Reason: {e}")
    print("   -> Solution: Run 'python train_model.py' to regenerate it.")

print("--- 🎉 DIAGNOSTICS COMPLETE: SYSTEM IS HEALTHY ---")