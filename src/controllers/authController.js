const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const User = require('../models/User');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

// Memory ထဲတွင် OTP စစ်ရန် Client များကို ခဏသိမ်းထားမည့် နေရာ
const pendingClients = new Map();

// ၁။ ဖုန်းနံပါတ်သို့ OTP ပို့ခြင်း
exports.sendCode = async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

    try {
        const stringSession = new StringSession(''); // Session အသစ်စမည်
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });

        await client.connect();
        const result = await client.sendCode({
            apiId: apiId,
            apiHash: apiHash
        }, phoneNumber);

        // Client Object နှင့် PhoneCodeHash ကို Map ထဲတွင် သိမ်းထားမည်
        pendingClients.set(phoneNumber, { client, phoneCodeHash: result.phoneCodeHash });

        res.status(200).json({ 
            success: true, 
            phoneCodeHash: result.phoneCodeHash, 
            message: "OTP sent to Telegram app" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ၂။ OTP ကို စစ်ဆေးပြီး MongoDB သို့ Session သိမ်းခြင်း
exports.verifyCode = async (req, res) => {
    const { phoneNumber, phoneCodeHash, code } = req.body;

    if (!phoneNumber || !phoneCodeHash || !code) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const sessionData = pendingClients.get(phoneNumber);
        if (!sessionData) {
            return res.status(400).json({ error: "Session expired or invalid. Please request OTP again." });
        }

        const { client } = sessionData;

        // OTP ဖြင့် Login ဝင်ခြင်း (Direct API Call ဖြင့် တိတိကျကျ ခေါ်မည်)
        await client.invoke(
            new Api.auth.SignIn({
                phoneNumber: phoneNumber,
                phoneCodeHash: phoneCodeHash,
                phoneCode: code
            })
        );

        // Login အောင်မြင်ပါက Session String ကို ထုတ်ယူမည်
        const sessionString = client.session.save();

        // MongoDB ထဲတွင် Update (သို့) အသစ် ဖန်တီးမည်
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            user = new User({ phoneNumber, telegramSession: sessionString });
        } else {
            user.telegramSession = sessionString;
        }
        await user.save();

        // Memory ထဲမှ ပြန်ဖျက်မည်
        pendingClients.delete(phoneNumber);

        res.status(200).json({ 
            success: true, 
            message: "Login successful and session saved",
            role: user.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
