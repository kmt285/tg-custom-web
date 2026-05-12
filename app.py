import os
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from pymongo import MongoClient
from functools import wraps

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['telegram_manager']
sessions_col = db['user_sessions']

# ==========================================
# PHASE 1: လုံခြုံရေးအတွက် API KEY သတ်မှတ်ခြင်း
# ==========================================
# .env ဖိုင်ထဲမှာ "API_KEY" ဆိုပြီး ထည့်ထားလို့ရပါတယ်။ 
# မထည့်ထားရင်တော့ အောက်က "tg_custom_secret_key_2026" ကို default အနေနဲ့ သုံးပါမယ်။
API_KEY = os.environ.get("API_KEY", "tg_custom_secret_key_2026")

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Request လာတိုင်း Header ထဲမှာ api key ပါ/မပါ စစ်ပါမယ်
        if request.headers.get('x-api-key') != API_KEY:
            abort(401, description="Unauthorized: Invalid API Key")
        return f(*args, **kwargs)
    return decorated_function
# ==========================================

@app.route('/', methods=['GET'])
def home():
    return "Telegram Custom Backend is running securely!"

@app.route('/api/save_session', methods=['POST'])
@require_api_key # ဒီ API ကို ခေါ်ဖို့ API Key လိုအပ်ကြောင်း သတ်မှတ်ခြင်း
def save_session():
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    sessions_col.update_one(
        {"user_id": user_id},
        {"$set": data},
        upsert=True
    )
    return jsonify({"status": "success", "message": "Session saved"})

@app.route('/api/get_sessions', methods=['GET'])
@require_api_key # ဒီ API ကို ခေါ်ဖို့ API Key လိုအပ်ကြောင်း သတ်မှတ်ခြင်း
def get_sessions():
    sessions = list(sessions_col.find({}, {"_id": 0}))
    return jsonify(sessions)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
