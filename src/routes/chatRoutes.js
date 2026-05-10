const express = require('express');
const router = express.Router();
// 🌟 Function အသစ်တွေကို Import လုပ်ပါ
const { getDialogs, getMessages, sendMessage } = require('../controllers/chatController');

router.get('/dialogs', getDialogs);
router.get('/messages', getMessages); // 🌟 Message ယူမည့် URL
router.post('/send', sendMessage);    // 🌟 စာပို့မည့် URL

module.exports = router;
