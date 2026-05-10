const express = require('express');
const router = express.Router();
const { getDialogs } = require('../controllers/chatController');

// GET request ဖြင့် ဆွဲထုတ်မည်
router.get('/dialogs', getDialogs);

module.exports = router;
