const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');

router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.session?.userId;
        const unreadCount = await notificationService.getUnreadCount(userId);
        res.json({ unreadCount });
    } catch (err) {
        res.status(500).json({ unreadCount: 0, error: err.message });
    }
});

module.exports = router;