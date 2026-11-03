const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class AuditLog extends Model {
        static ACTION_TYPES = {
            CREATE: 'create',
            UPDATE: 'update',
            DELETE: 'delete',
            LOGIN: 'login',
            LOGOUT: 'logout',
            EXPORT: 'export',
            IMPORT: 'import',
            APPROVE: 'approve',
            REJECT: 'reject',
            ASSIGN: 'assign',
            REVOKE: 'revoke',
            VIEW: 'view'
        };

        static MODULES = {
            USER: 'user',
            HRM: 'hrm',
            RBAC: 'rbac',
            SYSTEM: 'system',
            AUTH: 'auth',
            ORGANIZATION: 'organization'
        };

        static SEVERITY_LEVELS = {
            INFO: 'info',
            WARNING: 'warning',
            ERROR: 'error',
            CRITICAL: 'critical'
        };

        getActionTypeText() {
            const map = {
                'create': '创建',
                'update': '更新',
                'delete': '删除',
                'login': '登录',
                'logout': '登出',
                'export': '导出',
                'import': '导入',
                'approve': '审批',
                'reject': '退回',
                'assign': '分配',
                'revoke': '撤销',
                'view': '查看'
            };
            return map[this.action_type] || this.action_type;
        }

        getSeverityText() {
            const map = {
                'info': '信息',
                'warning': '警告',
                'error': '错误',
                'critical': '严重'
            };
            return map[this.severity] || this.severity;
        }

        getSeverityBadgeClass() {
            switch (this.severity) {
                case 'info': return 'bg-info';
                case 'warning': return 'bg-warning';
                case 'error': return 'bg-danger';
                case 'critical': return 'bg-dark';
                default: return 'bg-secondary';
            }
        }

        toSafeJSON() {
            return this.toJSON();
        }
    }

    AuditLog.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: '操作用户ID'
        },

        username: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '操作用户名（冗余字段，便于查询）'
        },

        module: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '模块名称：user, hrm, rbac, system, auth, organization'
        },

        action_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '操作类型：create, update, delete, login, logout等'
        },

        target_type: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '目标对象类型（如：User, Employee, Role等）'
        },

        target_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '目标对象ID'
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '操作描述'
        },

        old_values: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '操作前的值（JSON格式）'
        },

        new_values: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '操作后的值（JSON格式）'
        },

        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            comment: '操作IP地址'
        },

        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '用户代理字符串'
        },

        request_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '请求URL'
        },

        request_method: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '请求方法：GET, POST, PUT, DELETE等'
        },

        severity: {
            type: DataTypes.ENUM('info', 'warning', 'error', 'critical'),
            allowNull: false,
            defaultValue: 'info',
            comment: '严重程度：info, warning, error, critical'
        },

        status_code: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'HTTP状态码'
        },

        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '错误信息（如果有）'
        },

        extra_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '额外数据（JSON格式）'
        }
    }, {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false,

        indexes: [
            {
                fields: ['user_id'],
                name: 'idx_user_id'
            },
            {
                fields: ['module'],
                name: 'idx_module'
            },
            {
                fields: ['action_type'],
                name: 'idx_action_type'
            },
            {
                fields: ['target_type', 'target_id'],
                name: 'idx_target'
            },
            {
                fields: ['severity'],
                name: 'idx_severity'
            },
            {
                fields: ['created_at'],
                name: 'idx_created_at'
            },
            {
                fields: ['module', 'action_type'],
                name: 'idx_module_action'
            }
        ]
    });

    return AuditLog;
};