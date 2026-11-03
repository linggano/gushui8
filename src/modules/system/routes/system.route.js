const express = require('express');
const router = express.Router();

const SC = require('../controllers/system.controller');
const SV = require('../validators/system.validator');
const validate = require('../../../shared/utils/validate');

// 系统管理首页
router.get('/', (req, res) => res.redirect('/system/dashboard'));
router.get('/dashboard', SC.renderDashboard);

// 数据备份
router.post('/backup', SC.backupDatabase);
router.get('/backup/download/:filename', SC.downloadBackup);
router.post('/backup/restore/:filename', SV.filenameRules(), validate, SC.restoreBackup);
router.post('/backup/delete/:filename', SV.filenameRules(), validate, SC.deleteBackup);

module.exports = router;