const { validationResult } = require('express-validator');
const { ValidationError } = require('./errors');

module.exports = function validate(req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array().map(e => ({
            field: e.path,
            message: e.msg,
        }));
        console.error('[Validate] 校验失败:', JSON.stringify(errors));
        throw new ValidationError('参数校验失败', errors);
    }
    next();
};