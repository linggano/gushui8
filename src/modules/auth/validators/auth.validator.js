/**
 * @file   auth.validator.js
 * @path   src/modules/auth/validators/auth.validator.js
 * @type   javascript
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-10-31
 */

const { body, param, validationResult } = require('express-validator');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;

class AuthValidator {

    static loginRules() {
        return [
            body('identifier')
                .trim()
                .notEmpty().withMessage('用户名或邮箱不能为空')
                .isLength({ min: 2, max: 100 }).withMessage('输入长度应为 2-100 个字符')
                .custom(value => {
                    if (EMAIL_REGEX.test(value)) return true;
                    if (USERNAME_REGEX.test(value)) return true;
                    throw new Error('请输入有效的邮箱地址或用户名（2-20位，支持中英文/数字/下划线）');
                }),
            body('password_hash')
                .notEmpty().withMessage('密码不能为空')
                .isLength({ min: 6, max: 128 }).withMessage('密码长度应为 6-128 个字符'),
        ];
    }

    static unlockRules() {
        return [
            body('password')
                .notEmpty().withMessage('密码不能为空')
                .isLength({ min: 6, max: 128 }).withMessage('密码长度应为 6-128 个字符'),
        ];
    }
}

module.exports = AuthValidator;