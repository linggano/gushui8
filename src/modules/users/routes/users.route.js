const express = require('express');
const router = express.Router();

const { requirePermission } = require('../../../shared/middleware/rbac.middleware');
const UC = require('../controllers/user.controller');

router.get('/', requirePermission('user_manage'), UC.renderUserList);
router.get('/loginLogs', requirePermission('user_manage'), UC.renderUserLoginLogsList);

router.route('/detail/:userId')
    .get(requirePermission('user_manage'), UC.renderUserDetail)
    .delete(requirePermission('user_manage'), UC.deleteUser);

router.route('/:userId/unlock')
    .post(requirePermission('user_manage'), UC.unlockUser);

router.route('/:userId/lock')
    .post(requirePermission('user_manage'), UC.lockUser);

router.route('/:userId/verify')
    .post(requirePermission('user_manage'), UC.verifyUser);

module.exports = router;