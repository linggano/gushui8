const express = require('express')
const router = express.Router()

const { isAuthenticated } = require('../../../shared/middleware/auth.middleware');
const AuthValidator = require('../validators/auth.validator');
const AC = require('../controllers/auth.controller')
const validate = require('../../../shared/utils/validate')

router.route('/login')
    .get(AC.renderLoginForm)
    .post(AuthValidator.loginRules(), validate, AC.login);

router.route('/lockscreen')
    .get(isAuthenticated, AC.renderLockScreenForm)
    .post(isAuthenticated, AuthValidator.unlockRules(), validate, AC.unlock);

router.get('/lock', isAuthenticated, AC.lockScreen);
router.get('/logout', isAuthenticated, AC.logout);
router.get('/captcha', AC.getCaptcha);

module.exports = router