const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/send', chatController.sendMessage);
router.get('/history/:otherId', chatController.getChat);
router.get('/recent', chatController.getRecentConvos);

module.exports = router;
