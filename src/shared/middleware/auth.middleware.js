// src/shared/middleware/auth.middleware.js

const isApiRequest = require('../utils/isApiRequest');

/**
 * 登录检查（原 isAuthenticated）
 */
function isAuthenticated(req, res, next) {
    if (req.session?.userId) {
        return next();
    }

    // API 请求 → 401 JSON
    if (isApiRequest(req)) {
        return res.status(401).json({ code: 401, message: '请先登录' });
    }

    // 页面请求 → 跳登录页
    req.flash?.('error', ['请先登录']);
    return res.redirect('/auth/login');
}

/**
 * 游客检查（未登录才能访问，如登录页）
 */
function isGuest(req, res, next) {
    if (!req.session?.userId) {
        return next();
    }

    // 已登录 → 跳首页
    if (isApiRequest(req)) {
        return res.status(400).json({ code: 400, message: '您已登录' });
    }

    return res.redirect('/');
}

module.exports = {
    isApiRequest,
    isAuthenticated,
    isGuest
};