import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
# Frontend ကနေ လှမ်းချိတ်လို့ရအောင် CORS ဖွင့်ပေးထားခြင်း
CORS(app, resources={r"/*": {"origins": "*"}}) 

# MongoDB ချိတ်ဆက်ခြင်း
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['telegram_manager']
sessions_col = db['user_sessions']

@app.route('/', methods=['GET'])
def home():
    return "Telegram Custom Backend is running!"

@app.route('/api/save_session', methods=['POST'])
def save_session():
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    # အကောင့်ရှိရင် Update လုပ်မယ်၊ မရှိရင် အသစ်သွင်းမယ် (Upsert)
    sessions_col.update_one(
        {"user_id": user_id},
        {"$set": data},
        upsert=True
    )
    return jsonify({"status": "success", "message": "Session saved"})

@app.route('/api/get_sessions', methods=['GET'])
def get_sessions():
    # Admin အတွက် Session တွေအားလုံး ပြန်ထုတ်ပေးခြင်း
    sessions = list(sessions_col.find({}, {"_id": 0}))
    return jsonify(sessions)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
