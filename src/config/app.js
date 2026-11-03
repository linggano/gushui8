/**
 * @file   app.js
 * @path   src/config/app.js
 * @type   javascript
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-01
 */

const path = require('path');

const env = process.env.NODE_ENV || 'development';

module.exports = {
    env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',

    name: process.env.APP_NAME || 'Page Express Service',
    url: process.env.APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.PORT, 10) || 3000,
    timezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',

    https: {
        enabled: process.env.HTTPS_ENABLED === 'true',
        port: parseInt(process.env.HTTPS_PORT, 10) || 8443,
        keyPath: process.env.HTTPS_KEY_PATH || '',
        certPath: process.env.HTTPS_CERT_PATH || '',
    },

    /**
     * RBAC (Role-Based Access Control) 配置
     *
     * 控制流程参照 Yii2 framework/rbac：
     *   authManager (核心)  →  as access (全局过滤器)  →  ruleEngine (业务规则)
     *
     * 数据库模型：
     *   rbac_items       — 角色(type=1) / 权限(type=2) / 路由(type=3)
     *   rbac_item_child  — 层级关系 (角色→权限→路由)
     *   rbac_assignment  — 用户与角色的分配关系
     *   rbac_rule        — 业务规则定义
     */
    rbac: {

        // ============================================================
        // authManager — 核心 RBAC 管理器（对应 Yii2 authManager 组件）
        // ============================================================
        authManager: {
            class: 'DbManager',
            cache: {
                enabled: process.env.RBAC_CACHE_ENABLED !== 'false',
                duration: parseInt(process.env.RBAC_CACHE_DURATION, 10) || 3600,
            },
            defaultRoles: ['guest'],
            tables: {
                item: 'rbac_items',
                itemChild: 'rbac_item_child',
                assignment: 'rbac_assignment',
                rule: 'rbac_rule',
            },
        },

        // ============================================================
        // accessControl — 全局访问控制过滤器（对应 Yii2 as access）
        // ============================================================
        accessControl: {
            enabled: process.env.RBAC_ACCESS_CONTROL_ENABLED !== 'false',
            allowActions: [
                // '*',
                '/auth/login',
                '/auth/lockscreen',
                '/auth/logout',
                '/auth/captcha',
                '/favicon.ico',
            ],
            defaultRoles: ['guest'],
            denyCallback: null,
            rules: [
                {
                    allow: true,
                    roles: ['@'],
                },
            ],
        },

        // ============================================================
        // db — RBAC 数据库连接与表配置
        // ============================================================
        db: {
            dialect: process.env.RBAC_DB_DIALECT || process.env.DATABASE_DIALECT || 'sqlite',
            storage: process.env.RBAC_DB_STORAGE || process.env.DATABASE_STORAGE || 'database.sqlite',
            tables: {
                item: process.env.RBAC_ITEM_TABLE || 'rbac_items',
                itemChild: process.env.RBAC_ITEM_CHILD_TABLE || 'rbac_item_child',
                assignment: process.env.RBAC_ASSIGNMENT_TABLE || 'rbac_assignment',
                rule: process.env.RBAC_RULE_TABLE || 'rbac_rule',
            },
        },

        // ============================================================
        // cache — RBAC 权限数据缓存（提升 checkAccess 性能）
        // ============================================================
        cache: {
            enabled: process.env.RBAC_CACHE_ENABLED !== 'false',
            duration: parseInt(process.env.RBAC_CACHE_DURATION, 10) || 3600,
            keyPrefix: process.env.RBAC_CACHE_PREFIX || 'rbac:',
        },

        // ============================================================
        // ruleEngine — 业务规则引擎（对应 Yii2 Rule）
        //
        // 执行流程：
        //   权限项.rule_name → 查 rbac_rule 表获取规则 data → resolveRule(ruleName)
        //   → 动态加载 src/shared/rbac/rules/ 下对应规则文件 → 执行规则
        //
        // 规则文件命名约定：
        //   PascalCase (rule_name) → kebab-case (文件名)
        //   例：DeptScopeRule → dept-scope.rule.js
        // ============================================================
        ruleEngine: {
            enabled: process.env.RBAC_RULE_ENGINE_ENABLED !== 'false',
            rulesPath: 'src/shared/rbac/rules',
            loadStrategy: process.env.RBAC_RULE_LOAD_STRATEGY || 'auto',
        },

        // ============================================================
        // itemTypes — RBAC 项目类型常量（对应 Yii2 Item 类型）
        // ============================================================
        itemTypes: {
            ROLE: 1,
            PERMISSION: 2,
            ROUTE: 3,
        },

        // ============================================================
        // user — 用户表关联配置
        // ============================================================
        user: {
            table: process.env.RBAC_USER_TABLE || 'users',
            idField: process.env.RBAC_USER_ID_FIELD || 'id',
            statusField: process.env.RBAC_USER_STATUS_FIELD || 'status',
        },
    },

    upload: {
        // 用户实名头像上传
        avatar: {
            maxSize: parseInt(process.env.UPLOAD_AVATAR_MAX_SIZE, 10) || 2 * 1024 * 1024,
            dir: path.resolve(process.env.UPLOAD_AVATAR_DIR || 'uploads/avatars'),
            allowedTypes: (process.env.UPLOAD_AVATAR_TYPES || 'image/jpeg,image/png,image/gif,image/webp')
                .split(',').map(s => s.trim()).filter(Boolean),
            allowedExtensions: (process.env.UPLOAD_AVATAR_EXT || '.jpg,.jpeg,.png,.gif,.webp')
                .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        },

        // 内部资料上传（权限受限，需登录才能访问）
        internal: {
            maxSize: parseInt(process.env.UPLOAD_INTERNAL_MAX_SIZE, 10) || 20 * 1024 * 1024,
            dir: path.resolve(process.env.UPLOAD_INTERNAL_DIR || 'uploads/internal'),
            allowedTypes: (process.env.UPLOAD_INTERNAL_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain')
                .split(',').map(s => s.trim()).filter(Boolean),
            allowedExtensions: (process.env.UPLOAD_INTERNAL_EXT || '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar')
                .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        },

        // 公开资料上传（无需登录即可访问）
        public: {
            maxSize: parseInt(process.env.UPLOAD_PUBLIC_MAX_SIZE, 10) || 10 * 1024 * 1024,
            dir: path.resolve(process.env.UPLOAD_PUBLIC_DIR || 'uploads/public'),
            allowedTypes: (process.env.UPLOAD_PUBLIC_TYPES || 'image/jpeg,image/png,image/gif,application/pdf')
                .split(',').map(s => s.trim()).filter(Boolean),
            allowedExtensions: (process.env.UPLOAD_PUBLIC_EXT || '.jpg,.jpeg,.png,.gif,.pdf')
                .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
        },
    },

    passwordReset: {
        expiry: parseInt(process.env.PASSWORD_RESET_EXPIRY, 10) || 24 * 60 * 60 * 1000,
        tokenLength: parseInt(process.env.PASSWORD_RESET_TOKEN_LENGTH, 10) || 32,
    },

    log: {
        level: process.env.LOG_LEVEL || 'info',
        dir: path.resolve(process.env.LOG_DIR || './logs'),
        maxSize: parseInt(process.env.LOG_MAX_SIZE, 10) || 10 * 1024 * 1024,
        maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5,
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false',
    },

    pagination: {
        defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT, 10) || 10,
        maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT, 10) || 1000,
    },
};