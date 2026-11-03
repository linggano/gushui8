/**
 * @file   rbac.middleware.js
 * @path   src/shared/middleware/rbac.middleware.js
 * @type   javascript
 * @brief  RBAC 中间件：全局访问控制、权限检查、用户上下文注入、动态菜单树构建
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const { dbManager } = require('../rbac');
const { resolveDefaultRoute } = require('../rbac');
const { covers } = require('../rbac/db-manager');
const isApiRequest = require('../utils/isApiRequest');
const userService = require('../../modules/users/services/user.service');
const menuService = require('../../modules/system/services/menu.service');

let notificationService;
try {
    notificationService = require('../../modules/notification/services/notification.service');
} catch (_) {
    notificationService = { getUnreadCount: async () => 0 };
}

// ==========================================================
// 全局访问控制（类似 Yii2 as access）
// ==========================================================
function createAccessControl(options = {}) {
    const {
        defaultRoles = ['guest'],
        allowActions = []
    } = options;

    return function accessControl(req, res, next) {
        // 1. 白名单
        if (isAllowed(req, allowActions)) return next();

        // 2. 未登录
        if (!req.session?.userId) {
            return handleUnauthorized(req, res);
        }

        // 3. 权限检查
        const route = normalizeRoute(req);
        dbManager.checkAccess(req.session.userId, route)
        .then(hasAccess => {
            if (hasAccess) return next();
            return handleForbidden(req, res, req.session.userId);
        })
        .catch(err => next(err));
    };
}

// ==========================================================
// RBAC 上下文注入（供 Pug 用）
// 加载用户信息、权限、角色、菜单树，注入到 res.locals
// ==========================================================
function rbacContext(req, res, next) {
    const build = async () => {
        res.locals.user = null;
        res.locals.isAuthenticated = false;
        res.locals.hasPermission = async () => false;
        res.locals.userAvatar = '';
        res.locals.userPermissions = [];
        res.locals.userRoles = [];
        res.locals.menuTree = [];
        res.locals.can = () => false;
        res.locals.unreadNotificationCount = 0;

        if (req.session?.userId) {
            const userId = req.session.userId;

            const user = await userService.findById(userId);
            if (user && user.status !== 0) {
                res.locals.user = user.toSafeJSON ? user.toSafeJSON() : user.toJSON();
                res.locals.isAuthenticated = true;

                req.can = async function(permissionName) {
                    try {
                        return await user.can(permissionName);
                    } catch (_) {
                        return false;
                    }
                };

                req.hasRole = async function(roleName) {
                    try {
                        return await user.hasRole(roleName);
                    } catch (_) {
                        return false;
                    }
                };

                try {
                    const access = await dbManager.loadUserAccess(userId);
                    const permissionList = access.permissions || [];
                    res.locals.userPermissions = permissionList;
                    res.locals.userRoles = access.roles || [];

                    res.locals.menuTree = await buildUserMenuTree(access, userId);
                    res.locals.can = (target) => {
                        const targets = Array.isArray(target) ? target : [target];
                        return targets.some(t => permissionList.some(p => covers(p, t)));
                    };
                    res.locals.hasPermission = async (permission) => {
                        return await dbManager.checkAccess(userId, permission);
                    };
                } catch (_) {
                }

                // 加载用户头像
                try {
                    const identity = await user.getIdentity({ attributes: ['avatar'] });
                    res.locals.userAvatar = (identity && identity.avatar) ? identity.avatar : '';
                } catch (_) {
                    res.locals.userAvatar = '';
                }

                // 加载未读通知数量
                try {
                    res.locals.unreadNotificationCount = await notificationService.getUnreadCount(userId);
                } catch (_) {
                    res.locals.unreadNotificationCount = 0;
                }
            }
        }
    };

    build().then(() => next()).catch(next);
}

// ==========================================================
// 登录检查
// ==========================================================
function isAuthenticated(req, res, next) {
    if (req.session?.userId) return next();
    return handleUnauthorized(req, res);
}

// ==========================================================
// 权限检查（路由级）
// ==========================================================
function requirePermission(...permissions) {
    return async (req, res, next) => {
        if (!req.session?.userId) return handleUnauthorized(req, res);

        // super_admin 拥有所有权限，直接放行
        // if (res.locals.userRoles?.includes('super_admin')) return next();

        const hasAccess = await dbManager.checkAccess(
            req.session.userId,
            permissions
        );
        if (!hasAccess) return handleForbidden(req, res, req.session.userId);
        next();
    };
}

function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.session?.userId) return handleUnauthorized(req, res);

        const access = await dbManager.loadUserAccess(req.session.userId);
        const hasRole = roles.some(r => access.roles.includes(r));
        if (!hasRole) return handleForbidden(req, res, req.session.userId, access);
        next();
    };
}

// ==========================================================
// 资源所有权检查
// ==========================================================
function validateOwnership(getOwnerId, options = {}) {
    const { allowAdmin = true, paramName = 'id' } = options;

    return async (req, res, next) => {
        if (!req.session?.userId) return handleUnauthorized(req, res);

        const resourceId = req.params[paramName];
        const ownerId = await getOwnerId(resourceId, req);

        if (String(ownerId) === String(req.session.userId)) {
            return next();
        }

        if (allowAdmin) {
            const access = await dbManager.loadUserAccess(req.session.userId);
            if (access.roles.includes('super_admin') || access.roles.includes('system_admin')) {
                return next();
            }
        }

        return handleForbidden(req, res, req.session.userId);
    };
}

// ==========================================================
// 工具
// ==========================================================
function isAllowed(req, allowActions) {
    const route = normalizeRoute(req);
    return allowActions.some(p => matchPattern(p, route));
}

function normalizeRoute(req) {
    const method = req.method.toUpperCase();
    const routePath = req.route?.path
        ? (req.baseUrl || '') + req.route.path
        : (req.originalUrl || req.url).split('?')[0];
    return `${method} ${routePath}`;
}

function matchPattern(pattern, route) {
    if (pattern === '*') return true;
    const PLACEHOLDER = '\x00STAR\x00';
    const protectedStar = pattern.replace(/\*/g, PLACEHOLDER);
    const escaped = protectedStar
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(new RegExp(PLACEHOLDER.replace(/[.+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.*');
    const regex = new RegExp('^' + escaped + '$', 'i');
    return regex.test(route);
}

function handleUnauthorized(req, res) {
    if (isApiRequest(req)) {
        return res.status(401).json({ code: 401, message: '请先登录' });
    }
    req.flash?.('error', ['请先登录']);
    res.redirect('/auth/login');
}

async function handleForbidden(req, res, userId, access) {
    if (isApiRequest(req)) {
        return res.status(403).json({ code: 403, message: '权限不足' });
    }

    let homeRoute = '/';
    try {
        if (userId) {
            const userAccess = access || await dbManager.loadUserAccess(userId);
            homeRoute = await resolveDefaultRoute(userAccess, { id: userId });
        }
    } catch (_) {
        homeRoute = '/';
    }

    return res.status(403).render('errors/403', {
        title: '访问被拒绝',
        message: '您没有权限访问此页面，请联系管理员',
        homeRoute
    });
}

/**
 * 检查资源所有权（工厂函数）
 * @param {string} paramName - URL 参数名，默认 'id'
 * @param {Object} options - { allowAdmin: true }
 * @returns {Function} Express 中间件
 */
function isOwnerOrAdmin(paramName = 'id', options = {}) {
    return validateOwnership(
        async (resourceId) => resourceId,
        { allowAdmin: true, paramName, ...options }
    );
}

// ==========================================================
// 动态菜单树构建（menu 表驱动，按用户路由权限过滤）
// 返回结构：{ id, name, route, order, data, children }
// ==========================================================
// 单个菜单路由是否对用户可见
// 复用 covers 通配语义：`*` 全局、`xxx:*` 前缀、精确匹配，兼容尾部 `/xxx/*`
// itemsModel 为 access.items（Map<name, RbacItem>），含 type2 权限与 type3 路由
function isRouteMatch(items, routes, targetRoute) {
    if (!targetRoute || targetRoute === '#') return true;
    const target = String(targetRoute).replace(/\/+$/, '');
    // 直接命中用户已展开的路由（type3）
    if ((routes || []).some(r => {
        let cur = String(r).replace(/\/+$/, '');
        // 去除 HTTP 方法前缀（如 "GET /home" → "/home"），使 RBAC 路由名与菜单路由匹配
        cur = cur.replace(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|ANY)\s+/i, '');
        if (cur === target) return true;
        if (cur.endsWith('/*')) {
            const base = cur.slice(0, -2);
            return target === base || target.startsWith(base + '/');
        }
        return false;
    })) {
        return true;
    }
    // 通配符兜底（type2 权限如 `*`、`xxx:*`），与 checkAccess 一致
    if (items) {
        for (const item of items.values()) {
            const matched = covers(item.name, targetRoute);
            if (matched) {
                return true;
            }
        }
    }
    return false;
}

async function buildUserMenuTree(access, userId) {
    const userItems = access?.items || new Map();
    const userRoutes = access?.routes || [];

    const roles = access?.roles || [];
    const isSuperAdmin = roles.includes('super_admin') || roles.includes('system_admin');

    let tree;
    try {
        tree = await menuService.getMenuTree();
    } catch (_) {
        return [];
    }

    // 归一化：确保 children 字段存在
    const normalize = (list) => list.map(n => {
        n.children = n.children || [];
        n.route = n.route || '#';
        n.order = n.order || 0;
        return n;
    });

    const filter = (list) => list
        .filter(n => {
            if (isSuperAdmin) return true;
            if (n.children.length > 0) {
                n.children = filter(n.children);
                return n.children.length > 0;
            }
            const matched = isRouteMatch(userItems, userRoutes, n.route);
            return matched;
        });

    const resolved = filter(normalize(tree));

    const substituteParams = (list) => list.forEach(n => {
        if (userId) {
            n.route = String(n.route)
                .replace(/:userId\b/g, userId)
                .replace(/:uid\b/g, userId)
                .replace(/:id\b/g, userId);
        }
        if (n.children && n.children.length) substituteParams(n.children);
    });
    substituteParams(resolved);

    return resolved;
}

// ==========================================================
// 全局路由访问守卫
// 检查公共路径、登录状态、锁屏状态
// ==========================================================
function createGlobalAuthGuard(securityConfig) {
    return async function globalAuthGuard(req, res, next) {
        const isPublic = securityConfig.publicPaths.some(path => req.path.startsWith(path));
        const isLockRoute = req.path.startsWith('/auth/lock');

        if (isPublic) return next();

        if (!req.session || !req.session.userId) {
            if (isApiRequest(req)) {
                return res.status(401).json({ code: 401, message: '请先登录' });
            }
            req.flash?.('error', ['请先登录']);
            return res.redirect('/auth/login');
        }

        if (req.session.locked && !isLockRoute) {
            return res.redirect('/auth/lockscreen');
        }

        next();
    };
}

// ==========================================================
// 导出
// ==========================================================
module.exports = {
    isApiRequest,
    createAccessControl,
    createGlobalAuthGuard,
    rbacContext,
    isAuthenticated,
    requirePermission,
    requireRole,
    requireRoute: requirePermission,
    validateOwnership,
    handleForbidden,
    isOwnerOrAdmin,
    buildUserMenuTree
};