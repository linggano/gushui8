/**
 * @file   index.js
 * @path   src/shared/rbac/index.js
 * @type   javascript
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const { RbacAssignment, RbacItem, RbacItemChild, RbacRule, User } = require('../database');
const { resolveRule } = require('./rules');

function covers(pattern, target) {
    if (!pattern || !target) return false;
    if (pattern === '*') return true;

    const p = String(pattern);
    const t = String(target);

    if (p === t) return true;

    if (p.endsWith('.*')) {
        const prefix = p.slice(0, -2);
        return t === prefix || t.startsWith(prefix + '.');
    }

    if (p.endsWith('/*')) {
        const prefix = p.slice(0, -2);
        return t === prefix || t.startsWith(prefix + '/');
    }

    return false;
}

class DbManager {
    async loadUserAccess(userId) {
        if (!userId) {
            return { roles: [], permissions: [], items: new Map(), routes: [] };
        }

        const assignments = await RbacAssignment.findAll({
            where: { user_id: userId },
            include: [{
                model: RbacItem,
                as: 'rbacItem',
            }],
        });

        const directItems = assignments.map(a => a.rbacItem).filter(Boolean);
        const allItems = new Map();
        directItems.forEach(item => { if (item && item.name) allItems.set(item.name, item); });

        // 递归获取所有后代（Role → Permission → Route）
        const parentNames = directItems.map(item => item.name);
        let queue = [...parentNames];
        const processed = new Set(parentNames);
        while (queue.length > 0) {
            const childRecords = await RbacItemChild.findAll({
                where: { parent: queue },
            });
            queue = [];
            const newChildNames = childRecords.map(c => c.child).filter(name => !processed.has(name));
            if (newChildNames.length === 0) break;

            newChildNames.forEach(name => processed.add(name));

            const newItems = await RbacItem.findAll({ where: { name: newChildNames } });
            newItems.forEach(item => {
                if (item && item.name && !allItems.has(item.name)) {
                    allItems.set(item.name, item);
                    queue.push(item.name);
                }
            });
        }

        const roles = [];
        const permissions = [];
        const routes = [];

        allItems.forEach(item => {
            if (item.type === 1) {
                roles.push(item.name);
            } else if (item.type === 2) {
                permissions.push(item.name);
            } else if (item.type === 3) {
                routes.push(item.name);
            }
        });

        return { roles, permissions, items: allItems, routes };
    }

    async checkAccess(userId, permissionNames, params = {}) {
        if (!userId) return false;

        const access = await this.loadUserAccess(userId);

        const names = Array.isArray(permissionNames) ? permissionNames : [permissionNames];

        for (const name of names) {
            // 查找匹配的权限项（含 rule_name 信息）
            let matchedItem = null;

            // 直接匹配权限名
            if (access.permissions.includes(name)) {
                matchedItem = access.items.get(name);
            }

            // 通配符匹配（covers）
            if (!matchedItem) {
                for (const [permName, item] of access.items) {
                    if (item.type === 2 && covers(permName, name)) {
                        matchedItem = item;
                        break;
                    }
                }
            }

            // 路由匹配（路由无 rule_name，直接放行）
            if (!matchedItem) {
                if (access.routes.includes(name)) return true;
                for (const route of access.routes) {
                    if (covers(route, name)) return true;
                }
                continue;
            }

            // 权限项有 rule_name → 执行业务规则
            if (matchedItem.rule_name) {
                const rulePassed = await this._executeRule(matchedItem.rule_name, params);
                if (!rulePassed) continue;
            }

            return true;
        }

        return false;
    }

    /**
     * 根据 rule_name 执行对应的业务规则
     *
     * @param {string} ruleName  - 规则名称，对应 rbac_rule.name
     * @param {object} params    - 规则执行上下文参数
     * @returns {boolean} 规则是否通过
     */
    async _executeRule(ruleName, params = {}) {
        try {
            // 从 rbac_rule 表获取规则配置
            const ruleRecord = await RbacRule.findByPk(ruleName);
            if (!ruleRecord) {
                console.warn(`[RBAC] Rule record not found: ${ruleName}`);
                return true;
            }

            // 动态加载规则类
            const RuleClass = resolveRule(ruleName);
            if (!RuleClass) {
                console.warn(`[RBAC] Rule class not found: ${ruleName}`);
                return true;
            }

            // 实例化并执行规则
            const ruleInstance = typeof RuleClass === 'function'
                ? new RuleClass()
                : RuleClass;

            const result = await ruleInstance.execute(ruleRecord, params);
            return Boolean(result);
        } catch (err) {
            console.error(`[RBAC] Rule execution error: ${ruleName}`, err.message);
            return false;
        }
    }

    async getUserRoles(userId) {
        const access = await this.loadUserAccess(userId);
        return access.roles;
    }

    async getUserPermissions(userId) {
        const access = await this.loadUserAccess(userId);
        return access.permissions;
    }
}

const dbManager = new DbManager();

/**
 * 根据用户访问权限解析登录后的默认跳转路由
 *
 * 优先级（由高到低）：
 * 1. 用户偏好设定 → User.home_route（用户在「偏好设置」中指定的路由）
 * 2. 角色配置      → RbacItem.data.defaultRoute（角色 JSON 数据中的默认路由）
 * 3. 兜底          → super_admin/system_admin 跳 /home，否则取第一个可用路由，
 *                     无路由则返回 "/"
 *
 * @param {Object} access - 用户访问权限对象
 * @param {Object} [user]
 * @param {number|string} [user.id] - 用户 ID
 * @returns {Promise<string>} 默认路由路径
 */
async function resolveDefaultRoute(access, { id: userId } = {}) {
    const roles = access?.roles || [];
    const routes = access?.routes || [];

    // 优先级 1：用户偏好设定 home_route
    try {
        if (userId) {
            const user = await User.findByPk(userId, { attributes: ['home_route'] });
            if (user?.home_route) {
                const resolved = String(user.home_route)
                    .replace(/:userId\b/g, userId || '')
                    .replace(/:id\b/g, userId || '');
                return resolved.startsWith('/') ? resolved : '/' + resolved;
            }
        }
    } catch (_) {}

    // 优先级 2：角色 data.defaultRoute
    if (access?.items) {
        for (const roleName of roles) {
            const roleItem = access.items.get(roleName);
            if (roleItem) {
                const data = typeof roleItem.data === 'string'
                    ? JSON.parse(roleItem.data || '{}')
                    : (roleItem.data || {});
                if (data.defaultRoute) {
                    const resolved = String(data.defaultRoute)
                        .replace(/:userId\b/g, userId || '')
                        .replace(/:id\b/g, userId || '');
                    return resolved.startsWith('/') ? resolved : '/' + resolved;
                }
            }
        }
    }

    // 优先级 3：兜底 — super_admin / system_admin 跳 /home
    if (roles.includes('super_admin') || roles.includes('system_admin')) {
        return '/home';
    }

    // 兜底：取第一个可用路由
    if (routes.length > 0) {
        const resolved = routes[0]
            .replace(/:userId\b/g, userId || '')
            .replace(/:id\b/g, userId || '');
        return resolved.startsWith('/') ? resolved : '/' + resolved;
    }

    // 最终兜底
    return '/';
}

module.exports = {
    dbManager,
    resolveDefaultRoute,
    covers,
    DbManager,
};