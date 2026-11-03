const { AuditLog } = require("../../../shared/database");
const BaseRepository = require('../../../shared/database/repository');
const { Op } = require('sequelize');

class AuditRepository extends BaseRepository {
    constructor() {
        super(AuditLog);
    }

    async findAndCountAll({ 
        page = 1, 
        limit = 20, 
        module = null, 
        actionType = null,
        userId = null,
        severity = null,
        startDate = null,
        endDate = null,
        search = ''
    }) {
        const where = {};
        
        if (module) where.module = module;
        if (actionType) where.action_type = actionType;
        if (userId) where.user_id = userId;
        if (severity) where.severity = severity;
        
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.created_at[Op.lte] = new Date(endDate);
            }
        }
        
        if (search) {
            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { user_id: { [Op.like]: `%${search}%` } },
                { target_type: { [Op.like]: `%${search}%` } },
                { target_id: { [Op.like]: `%${search}%` } }
            ];
        }
        
        return await this.model.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit,
            offset: (page - 1) * limit
        });
    }

    async findByTarget(targetType, targetId) {
        return await this.model.findAll({
                                        where: {
                                            target_type: targetType,
                                            target_id: targetId
                                        },
                                        order: [['created_at', 'DESC']]
                                    });
    }

    async findByUserId(userId, limit = 50) {
        return await this.model.findAll({
                                        where: { user_id: userId },
                                        order: [['created_at', 'DESC']],
                                        limit
                                    });
    }

    async getModules() {
        const result = await this.model.findAll({
                                        attributes: [
                                            'module',
                                            [this.model.sequelize.fn('COUNT', '*'), 'count']
                                        ],
                                        group: ['module'],
                                        order: [['module', 'ASC']]
                                    });
                                    return result.map(item => ({
                                        module: item.module,
                                        count: parseInt(item.getDataValue('count'))
                                    }));
    }

    async getActionTypes(module = null) {
        const where = {};
                                    if (module) {
                                        where.module = module;
                                    }
                                    const result = await this.model.findAll({
                                        attributes: [
                                            'action_type',
                                            [this.model.sequelize.fn('COUNT', '*'), 'count']
                                        ],
                                        where,
                                        group: ['action_type'],
                                        order: [['action_type', 'ASC']]
                                    });
                                    return result.map(item => ({
                                        action_type: item.action_type,
                                        count: parseInt(item.getDataValue('count'))
                                    }));
    }

    async getSeverityStats(startDate = null, endDate = null) {
        const where = {};
                                    if (startDate || endDate) {
                                        where.created_at = {};
                                        if (startDate) {
                                            where.created_at[Op.gte] = new Date(startDate);
                                        }
                                        if (endDate) {
                                            where.created_at[Op.lte] = new Date(endDate);
                                        }
                                    }
                                    const result = await this.model.findAll({
                                        attributes: [
                                            'severity',
                                            [this.model.sequelize.fn('COUNT', '*'), 'count']
                                        ],
                                        where,
                                        group: ['severity'],
                                        order: [['severity', 'ASC']]
                                    });
                                    return result.map(item => ({
                                        severity: item.severity,
                                        count: parseInt(item.getDataValue('count'))
                                    }));
    }

    async deleteOlderThan(days) {
        const cutoffDate = new Date();
                                    cutoffDate.setDate(cutoffDate.getDate() - days);
                                    return await this.model.destroy({
                                        where: {
                                            created_at: {
                                                [Op.lt]: cutoffDate
                                            }
                                        }
                                    });
    }

    async getRecentLogs(limit = 10) {
        return await this.model.findAll({
                                        order: [['created_at', 'DESC']],
                                        limit
                                    });
    }
}

module.exports = new AuditRepository();