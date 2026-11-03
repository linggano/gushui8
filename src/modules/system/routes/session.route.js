const express = require('express');
const router = express.Router();

const SC = require('../controllers/session.controller');

router.get('/', SC.renderSessionList);
router.delete('/:sid', SC.kickSession);
router.post('/batch-kick', SC.batchKickSessions);
router.delete('/user/:userId', SC.kickUserSessions);

module.exports = router;