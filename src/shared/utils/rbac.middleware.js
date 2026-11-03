// src/shared/middlewares/rbac.middleware.js
const dbManager = require('../rbac');
const { resolveDefaultRoute } = require('../rbac');
const { covers } = require('../rbac/db-manager');
const { UserIdentity, Menu } = require('../database');
let notificationService;
try {
    notificationService = require('../../modules/notification/services/notification.service');
} catch (_) {
    notificationService = { getUnreadCount: async () => 0 };
}

/**
 * 判断是否为 API 请求
 */
function isApiRequest(req) {
    if (!req) return false;

    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (path.startsWith('/api/') || path === '/api') return true;

    const xrw = req.get?.('X-Requested-With') || req.headers['x-requested-with'];
    if (xrw && xrw.toLowerCase() === 'xmlhttprequest') return true;

    const accept = req.get?.('Accept') || req.headers.accept || '';
    if (accept.includes('application/json')) return true;

    const ct = req.get?.('Content-Type') || req.headers['content-type'] || '';
    if (ct.includes('application/json')) return true;

    const flag = req.get?.('X-Api-Request') || req.headers['x-api-request'];
    if (flag === 'true') return true;

    return false;
}

function validateOwnership(getOwnerId, options = {}) {
    const { allowAdmin = true, paramName = 'id' } = options;

    return async (req, res, next) => {
        if (!req.session?.user?.id) {
            return handleUnauthorized(req, res);
        }

        const resourceId = req.params[paramName];
        const ownerId = await getOwnerId(resourceId, req);

        if (String(ownerId) === String(req.session.user.id)) {
            return next();
        }

        if (allowAdmin) {
            const access = await dbManager.loadUserAccess(req.session.user.id);
            if (access.roles.includes('super_admin') || access.roles.includes('system_admin')) {
                return next();
            }
        }

        return handleForbidden(req, res, req.session.user.id);
    };
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
        if (!req.session?.user?.id) {
            return handleUnauthorized(req, res);
        }

        // 3. 权限检查
        const route = normalizeRoute(req);
        dbManager.checkAccess(req.session.user.id, route)
        .then(hasAccess => {
            if (hasAccess) return next();
            return handleForbidden(req, res, req.session.user.id);
        })
        .catch(err => next(err));
    };
}

// ==========================================================
// RBAC 上下文注入（供 Pug 用）
// ==========================================================
function rbacContext(req, res, next) {
    const build = async () => {
        if (req.session?.user) {
            const userId = req.session.user.id;
            res.locals.user = req.session.user;
            res.locals.hasPermission = async (permission) => {
                return await dbManager.checkAccess(userId, permission);
            };
            res.locals.userAvatar = '';

            // 同步权限集合（供模板按权限渲染菜单/按钮）
            const access = await dbManager.loadUserAccess(userId);
            const permissionList = access.permissions || [];
            res.locals.userPermissions = permissionList;
            res.locals.userRoles = access.roles || [];

            // 动态菜单树（数据库 menu 表驱动，按用户路由权限过滤）
            res.locals.menuTree = await buildUserMenuTree(access, userId);
            // 同步判断：支持单个权限或权限数组（任一匹配）；兼容 `*` / `xxx:*` 通配
            res.locals.can = (target) => {
                const targets = Array.isArray(target) ? target : [target];
                return targets.some(t => permissionList.some(p => covers(p, t)));
            };

            // 加载用户头像，供布局导航栏展示（登录后立即生效）
            try {
                const identity = await UserIdentity.findOne({
                    where: { id: userId },
                    attributes: ['avatar']
                });
                res.locals.userAvatar = (identity && identity.avatar) ? identity.avatar : '';
            } catch (_) {
                res.locals.userAvatar = '';
            }

            // 加载未读通知数量，供导航栏展示
            try {
                res.locals.unreadNotificationCount = await notificationService.getUnreadCount(userId);
            } catch (_) {
                res.locals.unreadNotificationCount = 0;
            }
        } else {
            res.locals.user = null;
            res.locals.userAvatar = '';
            res.locals.hasPermission = async () => false;
            res.locals.userPermissions = [];
            res.locals.userRoles = [];
            res.locals.menuTree = [];
            res.locals.can = () => false;
            res.locals.unreadNotificationCount = 0;
        }
    };

    build().then(() => next()).catch(next);
}

// ==========================================================
// 登录检查
// ==========================================================
function isAuthenticated(req, res, next) {
    if (req.session?.user?.id) return next();
    return handleUnauthorized(req, res);
}

// ==========================================================
// 权限检查（路由级）
// ==========================================================
function requirePermission(...permissions) {
    return async (req, res, next) => {
        if (!req.session?.user?.id) return handleUnauthorized(req, res);

        const hasAccess = await dbManager.checkAccess(
            req.session.user.id,
            permissions
        );
        if (!hasAccess) return handleForbidden(req, res, req.session.user.id);
        next();
    };
}

function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.session?.user?.id) return handleUnauthorized(req, res);

        const access = await dbManager.loadUserAccess(req.session.user.id);
        const hasRole = roles.some(r => access.roles.includes(r));
        if (!hasRole) return handleForbidden(req, res, req.session.user.id, access);
        next();
    };
}

// ==========================================================
// 资源所有权检查
// ==========================================================
function validateOwnership(getOwnerId, options = {}) {
    const { allowAdmin = true, paramName = 'id' } = options;

    return async (req, res, next) => {
        if (!req.session?.user?.id) return handleUnauthorized(req, res);

        const resourceId = req.params[paramName];
        const ownerId = await getOwnerId(resourceId, req);

        if (String(ownerId) === String(req.session.user.id)) {
            return next();
        }

        if (allowAdmin) {
            const access = await dbManager.loadUserAccess(req.session.user.id);
            if (access.roles.includes('super_admin') || access.roles.includes('system_admin')) {
                return next();
            }
        }

        return handleForbidden(req, res, req.session.user.id);
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
    if (!targetRoute || targetRoute === '#') return true; // 顶级/分组路由默认可见
    const target = String(targetRoute).replace(/\/+$/, '');
    // 直接命中用户已展开的路由（type3）
    if ((routes || []).some(r => {
        const cur = String(r).replace(/\/+$/, '');
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

function getDefaultMenuTree(userId, isSuperAdmin) {
    const menuItems = [
        {
            name: '功能模块',
            route: '#',
            order: 1,
            data: { icon: 'bi bi-grid-1x2-fill' },
            children: [
                {
                    name: '通知中心',
                    route: '/notifications',
                    order: 1,
                    data: { icon: 'bi bi-bell-fill' },
                    children: [],
                },
            ],
        },
    ];

    if (isSuperAdmin) {
        menuItems.push({
            name: '系统管理',
            route: '#',
            order: 9,
            data: { icon: 'bi bi-gear-fill' },
            children: [
                {
                    name: 'RBAC 权限管理',
                    route: '/system/rbac',
                    order: 1,
                    data: { icon: 'bi bi-shield-lock-fill' },
                    children: [],
                },
                {
                    name: '菜单管理',
                    route: '/system/menus',
                    order: 2,
                    data: { icon: 'bi bi-menu-button-wide-fill' },
                    children: [],
                },
                {
                    name: '用户管理',
                    route: '/users',
                    order: 3,
                    data: { icon: 'bi bi-people-fill' },
                    children: [],
                },
            ],
        });
    }

    const build = (items, parent) => items.map(item => ({
        id: item.route + (parent ? '_' + parent.id : ''),
        name: item.name,
        parent: null,
        route: item.route,
        order: item.order || 0,
        data: item.data || {},
        children: item.children ? build(item.children, item) : [],
    }));

    return build(menuItems, null);
}

async function buildUserMenuTree(access, userId) {
    const userItems = access?.items || new Map();
    const userRoutes = access?.routes || [];

    const roles = access?.roles || [];
    const isSuperAdmin = roles.includes('super_admin') || roles.includes('system_admin');

    let menus;
    try {
        menus = await Menu.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
    } catch (_) {
        menus = [];
    }

    // 当数据库菜单表为空时，提供默认的功能模块导航
    if (!menus || menus.length === 0) {
        return getDefaultMenuTree(userId, isSuperAdmin);
    }

    const nodes = new Map();
    menus.forEach(m => {
        nodes.set(m.id, {
            id: m.id,
            name: m.name,
            parent: m.parent || null,
            route: m.route || '#',
            order: m.order || 0,
            data: m.data || {},
            children: []
        });
    });

    const roots = [];
    nodes.forEach(node => {
        const parent = nodes.get(node.parent);
        if (parent) parent.children.push(node);
        else roots.push(node);
    });

    const filter = (list) => list
        .filter(n => {
            if (n.children.length > 0) {
                n.children = filter(n.children);
                return n.children.length > 0;
            }
            const matched = isRouteMatch(userItems, userRoutes, n.route);
            return matched;
        });

    const resolved = filter(roots);

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
// 导出
// ==========================================================
module.exports = {
    isApiRequest,
    createAccessControl,
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