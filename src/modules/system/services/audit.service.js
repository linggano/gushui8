const repository = require('../repositories/audit.repository');
const { AppError } = require('../../../shared/utils/errors');
const db = require('../../../shared/database');

function toJSONValue(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    if (value.toJSON) return value.toJSON();
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return null;
    }
}

async function resolveUsername(req) {
    const sessionUser = req?.session?.user;
    if (sessionUser && sessionUser.username) return sessionUser.username;

    const userId = req?.session?.userId;
    if (!userId || !db.User) return null;

    try {
        const user = await db.User.findByPk(userId, { attributes: ['username'] });
        return user ? user.username : null;
    } catch (_) {
        return null;
    }
}

async function log(req, data = {}) {
    const userId = req?.session?.userId || null;
    const username = await resolveUsername(req);

    const payload = {
        user_id: userId,
        username,
        module: data.module,
        action_type: data.actionType || data.action_type,
        target_type: data.targetType || data.target_type || null,
        target_id: data.targetId !== undefined && data.targetId !== null
            ? String(data.targetId)
            : (data.target_id !== undefined && data.target_id !== null ? String(data.target_id) : null),
        description: data.description || null,
        old_values: toJSONValue(data.oldValues !== undefined ? data.oldValues : data.old_values),
        new_values: toJSONValue(data.newValues !== undefined ? data.newValues : data.new_values),
        ip_address: req?.ip || req?.ips?.[0] || null,
        user_agent: req?.headers?.['user-agent'] || null,
        request_url: req?.originalUrl || req?.url || null,
        request_method: req?.method || null,
        severity: data.severity || 'info',
        status_code: data.statusCode || data.status_code || null,
        error_message: data.errorMessage || data.error_message || null,
        extra_data: toJSONValue(data.extraData !== undefined ? data.extraData : data.extra_data)
    };

    try {
        return await createAuditLog(payload);
    } catch (err) {
        console.warn('[AuditService] 审计日志写入失败:', err.message);
        return null;
    }
}

async function createAuditLog(data) {
    return await repository.create(data);
}

async function listAuditLogs(params) {
    return await repository.findAndCountAll(params);
}

async function getAuditLogById(id) {
    const log = await repository.findById(id);
    if (!log) {
        throw new AppError('审计日志不存在', 404);
    }
    return log;
}

async function getLogsByTarget(targetType, targetId) {
    return await repository.findByTarget(targetType, targetId);
}

async function getLogsByUserId(userId, limit = 50) {
    return await repository.findByUserId(userId, limit);
}

async function getModules() {
    return await repository.getModules();
}

async function getActionTypes(module = null) {
    return await repository.getActionTypes(module);
}

async function getSeverityStats(startDate = null, endDate = null) {
    return await repository.getSeverityStats(startDate, endDate);
}

async function cleanupOldLogs(days) {
    return await repository.deleteOlderThan(days);
}

async function getRecentLogs(limit = 10) {
    return await repository.getRecentLogs(limit);
}

module.exports = {
    log,
    createAuditLog,
    listAuditLogs,
    getAuditLogById,
    getLogsByTarget,
    getLogsByUserId,
    getModules,
    getActionTypes,
    getSeverityStats,
    cleanupOldLogs,
    getRecentLogs
};