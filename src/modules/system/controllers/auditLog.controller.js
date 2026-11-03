const AuditService = require('../services/audit.service');
const { getPagination, buildPaginationView } = require('../../../shared/utils/pagination');

class AuditLogController {
    renderAuditLogList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const query = req.query;

        const params = {
            page,
            limit: pageSize,
            module: query.module || null,
            actionType: query.actionType || null,
            userId: query.userId || null,
            severity: query.severity || null,
            startDate: query.startDate || null,
            endDate: query.endDate || null,
            search: query.search || ''
        };

        const result = await AuditService.listAuditLogs(params);
        const modules = await AuditService.getModules();
        const actionTypes = await AuditService.getActionTypes();

        res.render('system/auditLog/index', {
            title: '审计日志',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: '审计日志', href: '/system/auditLog' }
            ],
            logs: result.rows,
            modules,
            actionTypes,
            filters: {
                module: query.module || '',
                actionType: query.actionType || '',
                userId: query.userId || '',
                severity: query.severity || '',
                startDate: query.startDate || '',
                endDate: query.endDate || '',
                search: query.search || ''
            },
            pagination: buildPaginationView(result, { page, pageSize }, '/system/auditLog')
        });
    };

    renderAuditLogDetail = async (req, res) => {
        const log = await AuditService.getAuditLogById(req.params.id);
        const targetLogs = log.target_type && log.target_id
            ? await AuditService.getLogsByTarget(log.target_type, log.target_id)
            : [];
        const userLogs = log.user_id
            ? await AuditService.getLogsByUserId(log.user_id, 10)
            : [];

        res.render('system/auditLog/detail', {
            title: '审计日志详情',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: '审计日志', href: '/system/auditLog' },
                { label: '日志详情', href: '#' }
            ],
            log,
            targetLogs,
            userLogs
        });
    };

    renderAuditStats = async (req, res) => {
        const stats = await AuditService.getStatistics();
        const recentLogs = await AuditService.getRecentLogs(20);
        const severityStats = await AuditService.getSeverityStats();

        res.render('system/auditLog/stats', {
            title: '审计统计',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: '审计统计', href: '/system/auditLog/stats' }
            ],
            stats,
            recentLogs,
            severityStats
        });
    };

    cleanOldLogs = async (req, res) => {
        const days = parseInt(req.body.days) || 90;
        const result = await AuditService.cleanupOldLogs(days);
        res.json({ success: true, deleted: result, message: `已清理 ${result} 条日志` });
    };
}

module.exports = new AuditLogController();