const express = require('express');
const router = express.Router();

const AC = require('../controllers/auditLog.controller');

router.get('/', AC.renderAuditLogList);
router.get('/stats', AC.renderAuditStats);
router.get('/:id', AC.renderAuditLogDetail);
router.post('/clean', AC.cleanOldLogs);

module.exports = router;