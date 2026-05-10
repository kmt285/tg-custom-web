const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const User = require('../models/User');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

// မြန်ဆန်စေရန် Client များကို မှတ်ထားမည့် နေရာ (Connection ခဏခဏ မချိတ်ရအောင်)
const connectedClients = new Map();

async function getClient(user) {
    if (connectedClients.has(user.phoneNumber)) {
        return connectedClients.get(user.phoneNumber);
    }
    const stringSession = new StringSession(user.telegramSession);
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.connect();
    connectedClients.set(user.phoneNumber, client);
    return client;
}

exports.getDialogs = async (req, res) => {
    const { phoneNumber } = req.query;
    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(401).json({ error: "Not logged in" });

        const client = await getClient(user);
        const dialogs = await client.getDialogs({ limit: 20 });

        const chatList = dialogs.map(dialog => ({
            id: dialog.id.toString(),
            title: dialog.title,
            isGroup: dialog.isGroup,
            isChannel: dialog.isChannel,
            unreadCount: dialog.unreadCount,
            lastMessage: dialog.message ? dialog.message.message : "Media", 
            date: dialog.date
        }));
        res.status(200).json({ success: true, chats: chatList });
    } catch (error) {
        console.error("Get Dialogs Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch chats" });
    }
};

exports.getMessages = async (req, res) => {
    const { phoneNumber, chatId } = req.query;
    try {
        const user = await User.findOne({ phoneNumber });
        const client = await getClient(user);

        const messages = await client.getMessages(chatId, { limit: 30 });

        const messageList = messages.map(msg => {
            let mimeType = null;
            if (msg.media) {
                if (msg.media.className === 'MessageMediaPhoto') mimeType = 'image/jpeg';
                else if (msg.media.document && msg.media.document.mimeType) mimeType = msg.media.document.mimeType;
            }
            return {
                id: msg.id,
                text: msg.message || "",
                isMe: msg.out,
                date: msg.date,
                hasMedia: !!msg.media,
                mimeType: mimeType
            };
        });
        res.status(200).json({ success: true, messages: messageList.reverse() });
    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
};

// 🌟 RAM မစားစေရန် Streaming (ရေပိုက်စနစ်) ဖြင့် Media များကို ပို့ပေးမည့် API
exports.getMedia = async (req, res) => {
    const { phoneNumber, chatId, messageId } = req.query;
    try {
        const user = await User.findOne({ phoneNumber });
        const client = await getClient(user);

        const messages = await client.getMessages(chatId, { ids: [parseInt(messageId)] });
        const msg = messages[0];

        if (msg && msg.media) {
            let contentType = 'application/octet-stream';
            if (msg.media.className === 'MessageMediaPhoto') contentType = 'image/jpeg';
            else if (msg.media.document && msg.media.document.mimeType) contentType = msg.media.document.mimeType;

            res.setHeader('Content-Type', contentType);

            // RAM မပြည့်အောင် 512KB အပိုင်းလေးတွေခွဲပြီး တိုက်ရိုက် လွှတ်ပေးမည်
            for await (const chunk of client.iterDownload({
                file: msg.media,
                requestSize: 1024 * 512, 
            })) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.status(404).send("No media found");
        }
    } catch (error) {
        console.error("Media Error:", error);
        res.status(500).send("Error loading media");
    }
};

exports.sendMessage = async (req, res) => {
    const { phoneNumber, chatId, message } = req.body;
    try {
        const user = await User.findOne({ phoneNumber });
        const client = await getClient(user);

        const result = await client.sendMessage(chatId, { message: message });
        res.status(200).json({ success: true, messageId: result.id, text: "Sent" });
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ success: false, error: "Failed to send message" });
    }
};
