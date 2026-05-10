const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const User = require('../models/User');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

exports.getDialogs = async (req, res) => {
    // Frontend ကနေ ဖုန်းနံပါတ်ကို လှမ်းပို့ပေးရမယ်
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required to fetch chats" });
    }

    try {
        // ၁။ Database ထဲကနေ သက်ဆိုင်ရာ User ကို ရှာမယ်
        const user = await User.findOne({ phoneNumber });
        
        if (!user || !user.telegramSession) {
            return res.status(401).json({ error: "User not logged in or session expired" });
        }

        // ၂။ သိမ်းထားတဲ့ Session String နဲ့ Telegram ကို ပြန်ချိတ်မယ်
        const stringSession = new StringSession(user.telegramSession);
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });

        await client.connect();

        // ၃။ Chat List (Dialogs) တွေကို ဆွဲထုတ်မယ် (နောက်ဆုံး ၁၅ ခုပဲ အရင်ယူမယ်)
        const dialogs = await client.getDialogs({ limit: 15 });

        // ၄။ Frontend ကို ပို့ပေးဖို့ လိုအပ်တဲ့ Data လေးတွေပဲ ရွေးထုတ်မယ်
        const chatList = dialogs.map(dialog => ({
            id: dialog.id.toString(),
            title: dialog.title,
            isGroup: dialog.isGroup,
            isChannel: dialog.isChannel,
            unreadCount: dialog.unreadCount,
            // နောက်ဆုံး Message အကျဉ်းချုပ်
            lastMessage: dialog.message ? dialog.message.message : "Media/No text", 
            date: dialog.date
        }));

        // အလုပ်ပြီးရင် Client ကို ပိတ်မယ် (Memory မစားအောင်)
        await client.disconnect();

        res.status(200).json({ success: true, chats: chatList });

    } catch (error) {
        console.error("Get Dialogs Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch chats" });
    }
};


exports.getMessages = async (req, res) => {
    const { phoneNumber, chatId } = req.query;

    if (!phoneNumber || !chatId) {
        return res.status(400).json({ error: "Phone number and Chat ID are required" });
    }

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user || !user.telegramSession) {
            return res.status(401).json({ error: "User not logged in" });
        }

        const stringSession = new StringSession(user.telegramSession);
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
        });

        await client.connect();

        // သတ်မှတ်ထားတဲ့ Chat ID ကနေ နောက်ဆုံး Message အခု ၅၀ ကို ယူမယ်
        const messages = await client.getMessages(chatId, { limit: 50 });

        const messageList = messages.map(msg => ({
            id: msg.id,
            text: msg.message,
            isMe: msg.out, // ကိုယ်ပို့တဲ့စာလား၊ သူများပို့တဲ့စာလား
            date: msg.date,
            senderId: msg.senderId ? msg.senderId.toString() : null
        }));

        await client.disconnect();
        res.status(200).json({ success: true, messages: messageList.reverse() }); // အဟောင်းကနေ အသစ်စီရန် reverse လုပ်သည်

    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
};
