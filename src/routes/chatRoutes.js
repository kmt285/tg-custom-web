const express = require('express');
const router = express.Router();
const { getDialogs, getMessages, getMedia, sendMessage } = require('../controllers/chatController');

router.get('/dialogs', getDialogs);
router.get('/messages', getMessages);
router.get('/media', getMedia); // 🌟 Streaming Media အတွက် Route
router.post('/send', sendMessage);

module.exports = router;
