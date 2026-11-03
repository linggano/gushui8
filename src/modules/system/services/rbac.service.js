const rbacRepository = require('./../repositories/rbac.repository');
const { RbacItem, RbacItemChild, RbacRule, RbacAssignment } = require("../../../shared/database");
const AuditService = require('./audit.service');

const TYPE_ROLE = 1;
const TYPE_PERMISSION = 2;
const TYPE_ROUTE = 3;

class RbacService {
    constructor() {
        this.repo = rbacRepository;
    }

    // ==========================================================
    // Item Management (对应 Yii2 createRole/createPermission/add/update/remove)
    // ==========================================================

    async createItem(data) {
        const { name, type, description, rule_name, data: itemData } = data;

        const existing = await this.repo.findItemByName(name);
        if (existing) {
            throw new Error(`已存在同名项: ${name}`);
        }

        return await this.repo.createItem({
            name,
            type,
            description: description || name,
            rule_name: rule_name || null,
            data: itemData || {}
        });
    }

    async createRole(name, description, ruleName = null, data = {}) {
        return await this.createItem({
            name,
            type: TYPE_ROLE,
            description: description || name,
            rule_name: ruleName,
            data
        });
    }

    async createPermission(name, description, ruleName = null, data = {}) {
        return await this.createItem({
            name,
            type: TYPE_PERMISSION,
            description: description || name,
            rule_name: ruleName,
            data
        });
    }

    async createRoute(name, description, data = {}) {
        return await this.createItem({
            name,
            type: TYPE_ROUTE,
            description: description || name,
            data
        });
    }

    async updateItem(name, data) {
        const item = await this.repo.findItemByName(name);
        if (!item) {
            throw new Error(`项目不存在: ${name}`);
        }

        const updateData = {};
        if (data.description !== undefined) updateData.description = data.description;
        if (data.rule_name !== undefined) updateData.rule_name = data.rule_name;
        if (data.data !== undefined) updateData.data = data.data;

        await this.repo.updateItem(name, updateData);
        return await this.repo.findItemByName(name);
    }

    async getItem(name) {
        const item = await this.repo.findItemByName(name);
        if (!item) {
            throw new Error(`项目不存在: ${name}`);
        }
        return item;
    }

    async getRole(name) {
        const role = await this.repo.findRoleByName(name);
        if (!role) {
            throw new Error(`角色不存在: ${name}`);
        }
        return role;
    }

    async getPermission(name) {
        const permission = await this.repo.findPermissionByName(name);
        if (!permission) {
            throw new Error(`权限不存在: ${name}`);
        }
        return permission;
    }

    async getRoute(name) {
        const route = await this.repo.findRouteByName(name);
        if (!route) {
            throw new Error(`路由不存在: ${name}`);
        }
        return route;
    }

    async getRoles(options = {}) {
        const { page, limit, search } = options;
        if (page && limit) {
            return await this.repo.getItemsByType(TYPE_ROLE, page, limit, search);
        }
        return await this.repo.findAllItemsByType(TYPE_ROLE, options);
    }

    async getPermissions(options = {}) {
        const { page, limit, search } = options;
        if (page && limit) {
            return await this.repo.getItemsByType(TYPE_PERMISSION, page, limit, search);
        }
        return await this.repo.findAllItemsByType(TYPE_PERMISSION, options);
    }

    async getRoutes(options = {}) {
        const { page, limit, search } = options;
        if (page && limit) {
            return await this.repo.getItemsByType(TYPE_ROUTE, page, limit, search);
        }
        return await this.repo.findAllItemsByType(TYPE_ROUTE, options);
    }

    async removeItem(name) {
        const item = await this.repo.findItemByName(name);
        if (!item) {
            throw new Error(`项目不存在: ${name}`);
        }

        await this.repo.removeAllRelations(name);
        await this.repo.deleteAllUserAssignmentsByItem(name);
        return await this.repo.deleteItem(name);
    }

    // ==========================================================
    // Hierarchy Management (对应 Yii2 addChild/removeChild/getChildren/hasChild/canAddChild)
    // ==========================================================

    async addChild(parentName, childName) {
        if (parentName === childName) {
            throw new Error('不能将自己添加为自己的子项');
        }

        const parent = await this.repo.findItemByName(parentName);
        if (!parent) {
            throw new Error(`父项不存在: ${parentName}`);
        }

        const child = await this.repo.findItemByName(childName);
        if (!child) {
            throw new Error(`子项不存在: ${childName}`);
        }

        const exists = await this.repo.hasChild(parentName, childName);
        if (exists) {
            throw new Error(`关系已存在: ${parentName} -> ${childName}`);
        }

        await this.canAddChild(parentName, childName);

        return await this.repo.addChild(parentName, childName);
    }

    async canAddChild(parentName, childName) {
        const parent = await this.repo.findItemByName(parentName);
        const child = await this.repo.findItemByName(childName);

        if (!parent) throw new Error(`父项不存在: ${parentName}`);
        if (!child) throw new Error(`子项不存在: ${childName}`);

        const parentType = parent.type;
        const childType = child.type;

        if (parentType > childType) {
            throw new Error(`无效的父子关系: ${RbacItem.TYPE_MAP[parentType]} 不能是 ${RbacItem.TYPE_MAP[childType]} 的父级`);
        }

        const hasCycle = await RbacItemChild.checkCircularReference(parent, child);
        if (hasCycle) {
            throw new Error('检测到循环引用');
        }

        return true;
    }

    async removeChild(parentName, childName) {
        const exists = await this.repo.hasChild(parentName, childName);
        if (!exists) {
            throw new Error(`关系不存在: ${parentName} -> ${childName}`);
        }
        return await this.repo.removeChild(parentName, childName);
    }

    async removeChildren(parentName) {
        return await this.repo.removeChildren(parentName);
    }

    async hasChild(parentName, childName) {
        return await this.repo.hasChild(parentName, childName);
    }

    async getChildren(name) {
        return await this.repo.getChildrenWithItems(name);
    }

    async getParents(name) {
        return await this.repo.getParentsWithItems(name);
    }

    async getDescendants(name) {
        const names = await this.repo.getDescendantNames(name);
        if (names.length === 0) return [];
        return await this.repo.findItemsByNames(names);
    }

    async getAncestors(name) {
        const names = await this.repo.getAncestorNames(name);
        if (names.length === 0) return [];
        return await this.repo.findItemsByNames(names);
    }

    // ==========================================================
    // Assignment Management (对应 Yii2 assign/revoke/revokeAll/getAssignments)
    // ==========================================================

    async assign(roleName, userId) {
        const role = await this.repo.findRoleByName(roleName);
        if (!role) {
            throw new Error(`角色不存在: ${roleName}`);
        }

        const existing = await this.repo.findAssignment(userId, roleName);
        if (existing) {
            return existing;
        }

        return await this.repo.createAssignment({
            user_id: String(userId),
            item_name: roleName,
            created_at: Date.now()
        });
    }

    async revoke(roleName, userId) {
        return await this.repo.deleteAssignment(userId, roleName);
    }

    async revokeAll(userId) {
        return await this.repo.deleteAllUserAssignments(userId);
    }

    async getAssignment(roleName, userId) {
        return await this.repo.findAssignment(userId, roleName);
    }

    async getAssignments(userId) {
        return await this.repo.getAssignmentsByUser(userId);
    }

    async getUserIdsByRole(roleName) {
        return await this.repo.getUserIdsByRole(roleName);
    }

    async getUsersByRole(roleName) {
        return await this.repo.findUsersByRole(roleName);
    }

    // ==========================================================
    // Rule Management (对应 Yii2 getRule/getRules/addRule/updateRule/removeRule)
    // ==========================================================

    async getRule(name) {
        const rule = await this.repo.findRuleByName(name);
        if (!rule) {
            throw new Error(`规则不存在: ${name}`);
        }
        return rule;
    }

    async getRules(options = {}) {
        const { page, limit, search } = options;
        if (page && limit) {
            return await this.repo.findAllRules(page, limit, { search });
        }
        return await this.repo.ruleModel.findAll(options);
    }

    async addRule(ruleData) {
        const { name, description, data } = ruleData;
        const existing = await this.repo.findRuleByName(name);
        if (existing) {
            throw new Error(`规则已存在: ${name}`);
        }
        return await this.repo.createRule({ name, description: description || null, data: data || {} });
    }

    async updateRule(name, ruleData) {
        const rule = await this.repo.findRuleByName(name);
        if (!rule) {
            throw new Error(`规则不存在: ${name}`);
        }
        const { data, description } = ruleData;
        const updates = {};
        if (data !== undefined) updates.data = data;
        if (description !== undefined) updates.description = description;
        return await this.repo.updateRule(name, updates);
    }

    async removeRule(name) {
        const items = await this.repo.findItemsByRuleName(name);
        if (items.length > 0) {
            const itemNames = items.map(i => i.name).join(', ');
            throw new Error(`规则被以下项目使用，无法删除: ${itemNames}`);
        }
        return await this.repo.deleteRule(name);
    }

    // ==========================================================
    // Access Check (对应 Yii2 checkAccess / getRolesByUser / getPermissionsByUser)
    // ==========================================================

    async checkAccess(userId, permissionName) {
        if (!userId) return false;
        const permissions = await this.getPermissionsByUser(userId);
        return permissions.some(p => p.name === permissionName);
    }

    async getRolesByUser(userId) {
        return await this.repo.getRolesByUser(userId);
    }

    async getPermissionsByUser(userId) {
        return await this.repo.getPermissionsByUser(userId);
    }

    async getPermissionsByRole(roleName) {
        return await this.repo.getPermissionsByRole(roleName);
    }

    async getUserRoleNames(userId) {
        const roles = await this.repo.getRolesByUser(userId);
        return roles.map(r => r.name);
    }

    async getUserPermissionNames(userId) {
        const permissions = await this.repo.getPermissionsByUser(userId);
        return permissions.map(p => p.name);
    }

    // ==========================================================
    // Bulk Operations (对应 Yii2 removeAll/removeAllRoles/removeAllPermissions/removeAllRules/removeAllAssignments)
    // ==========================================================

    async removeAll() {
        return await this.repo.removeAllData();
    }

    async removeAllRoles() {
        const roles = await this.repo.findAllItemsByType(TYPE_ROLE);
        for (const role of roles) {
            await this.repo.removeAllRelations(role.name);
            await this.repo.deleteAllUserAssignmentsByItem(role.name);
        }
        return await this.repo.removeAllItemsByType(TYPE_ROLE);
    }

    async removeAllPermissions() {
        const permissions = await this.repo.findAllItemsByType(TYPE_PERMISSION);
        for (const perm of permissions) {
            await this.repo.removeAllRelations(perm.name);
        }
        return await this.repo.removeAllItemsByType(TYPE_PERMISSION);
    }

    async removeAllRoutes() {
        const routes = await this.repo.findAllItemsByType(TYPE_ROUTE);
        for (const route of routes) {
            await this.repo.removeAllRelations(route.name);
        }
        return await this.repo.removeAllItemsByType(TYPE_ROUTE);
    }

    async removeAllAssignments() {
        return await this.repo.removeAllAssignments();
    }

    async removeAllRules() {
        const rules = await this.repo.ruleModel.findAll();
        for (const rule of rules) {
            const items = await this.repo.findItemsByRuleName(rule.name);
            if (items.length > 0) {
                throw new Error(`规则 ${rule.name} 被项目使用，无法批量删除`);
            }
        }
        return await this.repo.removeAllRules();
    }

    // ==========================================================
    // Route Scanning (路由扫描，将 Express 路由同步到数据库)
    // ==========================================================

    async saveScannedRoutes(selected) {
        return await this.repo.saveScannedRoutes(selected);
    }

    // ==========================================================
    // Utility
    // ==========================================================

    async validateItemName(name, type) {
        if (!name || name.trim().length === 0) {
            throw new Error('名称不能为空');
        }

        if (type === TYPE_ROUTE && !name.startsWith('/')) {
            name = '/' + name;
        }

        const existing = await this.repo.findItemByName(name);
        if (existing) {
            throw new Error(`名称已存在: ${name}`);
        }

        return true;
    }
}

module.exports = new RbacService();