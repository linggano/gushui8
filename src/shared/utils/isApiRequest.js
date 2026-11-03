/**
 * @file   isApiRequest.js
 * @path   src/shared/utils/isApiRequest.js
 * @brief  判断请求是否为 API 请求的统一工具函数
 *
 * 判断依据（任一满足即为 API 请求）：
 * 1. URL 以 /api 开头
 * 2. Express 内置 xhr 属性（X-Requested-With: XMLHttpRequest）
 * 3. Accept 头包含 application/json
 * 4. Content-Type 包含 application/json
 * 5. 自定义标记 X-Api-Request: true
 */

/**
 * 判断是否为 API 请求
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isApiRequest(req) {
    if (!req) return false;

    // 1. URL 前缀判断
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (path.startsWith('/api/') || path === '/api') {
        return true;
    }

    // 2. Express 内置 xhr（等价于 X-Requested-With: XMLHttpRequest）
    if (req.xhr) {
        return true;
    }

    // 3. Accept 头
    const accept = req.get?.('Accept') || req.headers?.accept || '';
    if (accept.includes('application/json')) {
        return true;
    }

    // 4. Content-Type
    const contentType = req.get?.('Content-Type') || req.headers?.['content-type'] || '';
    if (contentType.includes('application/json')) {
        return true;
    }

    // 5. 自定义标记
    const apiFlag = req.get?.('X-Api-Request') || req.headers?.['x-api-request'];
    if (apiFlag === 'true') {
        return true;
    }

    return false;
}

module.exports = isApiRequest;