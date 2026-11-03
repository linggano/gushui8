/**
 * @file   response.middleware.js
 * @path   src/shared/middleware/response.middleware.js
 * @type   javascript
 * @brief  响应中间件：上传访问控制、公共上传目录检查、API请求判断
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const appConfig = require('../../config/app');
const isApiRequest = require('../utils/isApiRequest');

const PUBLIC_UPLOAD_DIR = (appConfig.upload.public.dir || '').replace(/\\/g, '/');

function isUploadRequest(url) {
    return url && url.startsWith('/uploads/');
}

function isPublicUpload(url) {
    return url && url.startsWith('/' + PUBLIC_UPLOAD_DIR.replace(/^\/+/, ''));
}

function uploadAccessControl(req, res, next) {
    const requestPath = (req.originalUrl || req.url || '').split('?')[0];

    if (!isUploadRequest(requestPath)) {
        return next();
    }

    if (isPublicUpload(requestPath)) {
        return next();
    }

    if (req.session?.userId) {
        return next();
    }

    // 404 避免泄露受保护文件是否存在
    if (isApiRequest(req)) {
        return res.status(404).json({ code: 404, message: '文件不存在' });
    }

    res.status(404).type('text/plain').send('Not Found');
}

module.exports = {
    uploadAccessControl,
    isUploadRequest,
    isPublicUpload,
};