const { User, RbacItem, RbacItemChild, RbacRule, RbacAssignment } = require("../../../shared/database");
const BaseRepository = require('../../../shared/database/repository');
const { Op } = require('sequelize');

class RbacRepository extends BaseRepository {
    constructor() {
        super(User);
        this.itemModel = RbacItem;
        this.itemChildModel = RbacItemChild;
        this.ruleModel = RbacRule;
        this.assignmentModel = RbacAssignment;
    }

    async findUserById(userId, options = {}) {
        return await User.findByPk(userId, options);
    }

    async findItemByName(name, options = {}) {
        const opt = { where: { name }, ...options };
        return await this.itemModel.findOne(opt);
    }

    async findItemsByNames(names, options = {}) {
        if (!names || names.length === 0) return [];
        const opt = { where: { name: { [Op.in]: names } }, ...options };
        return await this.itemModel.findAll(opt);
    }

    async findAllItems(options = {}) {
        return await this.itemModel.findAll(options);
    }

    async createItem(data) {
        return await this.itemModel.create(data);
    }

    async updateItem(name, data, options = {}) {
        return await this.itemModel.update(data, { where: { name }, ...options });
    }

    async deleteItem(name) {
        return await this.itemModel.destroy({ where: { name } });
    }

    async findRoleByName(name, options = {}) {
        const opt = { where: { name, type: 1 }, ...options };
        return await this.itemModel.findOne(opt);
    }

    async findPermissionByName(name, options = {}) {
        const opt = { where: { name, type: 2 }, ...options };
        return await this.itemModel.findOne(opt);
    }

    async findRouteByName(name, options = {}) {
        const opt = { where: { name, type: 3 }, ...options };
        return await this.itemModel.findOne(opt);
    }

    async findRouteByPath(path, options = {}) {
        const opt = { where: { name: path, type: 3 }, ...options };
        return await this.itemModel.findOne(opt);
    }

    async findAllRoles(page = 1, limit = 10, search = '') {
        const where = { type: 1 };
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }
        return await this.itemModel.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (page - 1) * limit,
            limit
        });
    }

    async findAllPermissions(page = 1, limit = 10, search = '') {
        const where = { type: 2 };
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }
        return await this.itemModel.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (page - 1) * limit,
            limit
        });
    }

    async findAllRoutes(page = 1, limit = 10, options = {}) {
        const where = { type: 3 };
        if (options.search) {
            where.name = { [Op.like]: `%${options.search}%` };
        }
        return await this.itemModel.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (page - 1) * limit,
            limit
        });
    }

    async countByType(type, options = {}) {
        return await this.itemModel.count({ where: { type }, ...options });
    }

    async findItemChildren(parentName) {
        return await this.itemChildModel.findAll({ where: { parent: parentName } });
    }

    async findChildrenByParents(parentNames) {
        if (!parentNames || parentNames.length === 0) return [];
        return await this.itemChildModel.findAll({ where: { parent: { [Op.in]: parentNames } } });
    }

    async findItemsByChildren(childNames) {
        if (!childNames || childNames.length === 0) return [];
        const relations = await this.itemChildModel.findAll({
            where: { child: { [Op.in]: childNames } }
        });
        const parentNames = relations.map(r => r.parent);
        return await this.itemModel.findAll({ where: { name: { [Op.in]: parentNames } } });
    }

    async addChild(parentName, childName) {
        return await this.itemChildModel.create({ parent: parentName, child: childName });
    }

    async removeChild(parentName, childName) {
        return await this.itemChildModel.destroy({
            where: { parent: parentName, child: childName }
        });
    }

    async removeAllRelations(name, options = {}) {
        return await this.itemChildModel.destroy({
            where: { [Op.or]: [{ parent: name }, { child: name }] },
            ...options
        });
    }

    async bulkCreateAssignments(records, options = {}) {
        return await this.assignmentModel.bulkCreate(records, options);
    }

    async findAssignments(userId = null, itemName = null) {
        const where = {};
        if (userId) where.user_id = String(userId);
        if (itemName) where.item_name = itemName;
        return await this.assignmentModel.findAll({ where });
    }

    async findAssignment(userId, itemName) {
        return await this.assignmentModel.findOne({
            where: { user_id: String(userId), item_name: itemName }
        });
    }

    async findOrCreateAssignment(userId, itemName) {
        return await this.assignmentModel.findOrCreate({
            where: { user_id: String(userId), item_name: itemName },
            defaults: { 
                user_id: String(userId), 
                item_name: itemName,
                created_at: Date.now()
            }
        });
    }

    async createAssignment(data) {
        return await this.assignmentModel.create(data);
    }

    async deleteAssignment(userId, itemName) {
        return await this.assignmentModel.destroy({
            where: { user_id: String(userId), item_name: itemName }
        });
    }

    async deleteAllUserAssignments(userId) {
        return await this.assignmentModel.destroy({
            where: { user_id: String(userId) }
        });
    }

    async deleteAllUserAssignmentsByItem(itemName, options = {}) {
        return await this.assignmentModel.destroy({
            where: { item_name: itemName },
            ...options
        });
    }

    async findItemsByRuleName(ruleName) {
        return await this.itemModel.findAll({ where: { rule_name: ruleName } });
    }

    async countRules() {
        return await this.ruleModel.count();
    }

    async findAllRules(page = 1, limit = 10, { search = '' } = {}) {
        const where = {};
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }
        return await this.ruleModel.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (page - 1) * limit,
            limit
        });
    }

    async findRuleByName(name) {
        return await this.ruleModel.findByPk(name);
    }

    async createRule(data) {
        return await this.ruleModel.create(data);
    }

    async updateRule(name, data) {
        return await this.ruleModel.update(data, { where: { name } });
    }

    async deleteRule(name) {
        return await this.ruleModel.destroy({ where: { name } });
    }

    async deleteRuleByName(name) {
        return await this.ruleModel.destroy({ where: { name } });
    }

    async checkUserRole(userId, roleName) {
        const assignment = await this.assignmentModel.findOne({
            where: {
                user_id: String(userId),
                item_name: roleName
            }
        });
        return !!assignment;
    }

    async checkUserPermission(userId, permissionName) {
        const assignment = await this.assignmentModel.findOne({
            where: {
                user_id: String(userId),
                item_name: permissionName
            }
        });
        return !!assignment;
    }

    async getUserRoles(userId) {
        const assignments = await this.assignmentModel.findAll({
            where: {
                user_id: String(userId)
            }
        });
        const itemNames = assignments.map(a => a.item_name);
        if (itemNames.length === 0) return [];
        return await this.itemModel.findAll({
            where: {
                name: { [Op.in]: itemNames },
                type: 1
            }
        });
    }

    async getUserPermissions(userId) {
        const assignments = await this.assignmentModel.findAll({
            where: {
                user_id: String(userId)
            }
        });
        const itemNames = assignments.map(a => a.item_name);
        if (itemNames.length === 0) return [];

        // 递归获取所有子孙权限
        const allDescendants = new Set();
        const queue = [...itemNames];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            const children = await this.itemChildModel.findAll({
                where: { parent: current }
            });

            for (const child of children) {
                allDescendants.add(child.child);
                queue.push(child.child);
            }
        }

        // 合并直接分配的权限和继承的权限
        const allPermissionNames = new Set([
            ...itemNames.filter(name => {
                // 只保留 type=2 的权限
                return true; // 先收集所有名称，后面再过滤
            }),
            ...allDescendants
        ]);

        if (allPermissionNames.size === 0) return [];

        // 查询所有权限详情，并过滤出 type=2 的权限
        const allItems = await this.itemModel.findAll({
            where: {
                name: { [Op.in]: [...allPermissionNames] }
            }
        });

        // 只返回权限（type=2），不包含角色（type=1）和路由（type=3）
        return allItems.filter(item => item.type === 2);
    }

    async getUserRoleAssignments(userId) {
        return await this.assignmentModel.findAll({
            where: { user_id: String(userId) }
        });
    }

    async saveScannedRoutes(selected) {
        let created = 0;
        let updated = 0;

        for (const route of selected) {
            const path = route.path || route;
            const methods = route.methods || ['GET'];

            const existing = await this.itemModel.findOne({
                where: { name: path, type: 3 }
            });

            const data = { method: methods };

            if (existing) {
                await existing.update({ data });
                updated++;
            } else {
                await this.itemModel.create({
                    name: path,
                    type: 3,
                    description: path,
                    data: data
                });
                created++;
            }
        }

        if (typeof this.clearCache === 'function') {
            this.clearCache();
        }

        return { created, updated };
    }

    async hasChild(parentName, childName) {
        const relation = await this.itemChildModel.findOne({
            where: { parent: parentName, child: childName }
        });
        return !!relation;
    }

    async getChildrenWithItems(parentName) {
        const relations = await this.itemChildModel.findAll({
            where: { parent: parentName }
        });
        if (relations.length === 0) return [];

        const childNames = relations.map(r => r.child);
        return await this.itemModel.findAll({
            where: { name: { [Op.in]: childNames } }
        });
    }

    async getParentsWithItems(childName) {
        const relations = await this.itemChildModel.findAll({
            where: { child: childName }
        });
        if (relations.length === 0) return [];

        const parentNames = relations.map(r => r.parent);
        return await this.itemModel.findAll({
            where: { name: { [Op.in]: parentNames } }
        });
    }

    async getDescendantNames(name) {
        const descendantNames = new Set();
        const queue = [name];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            const children = await this.itemChildModel.findAll({
                where: { parent: current }
            });

            for (const rel of children) {
                descendantNames.add(rel.child);
                queue.push(rel.child);
            }
        }

        return [...descendantNames];
    }

    async getAncestorNames(name) {
        const ancestorNames = new Set();
        const queue = [name];
        const visited = new Set();

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);

            const parents = await this.itemChildModel.findAll({
                where: { child: current }
            });

            for (const rel of parents) {
                ancestorNames.add(rel.parent);
                queue.push(rel.parent);
            }
        }

        return [...ancestorNames];
    }

    async removeChildren(parentName) {
        return await this.itemChildModel.destroy({
            where: { parent: parentName }
        });
    }

    async getUserIdsByRole(roleName) {
        const assignments = await this.assignmentModel.findAll({
            where: { item_name: roleName },
            attributes: ['user_id']
        });
        return [...new Set(assignments.map(a => a.user_id))];
    }

    async getItemsByType(type, page = 1, limit = 10, search = '') {
        const where = { type };
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }
        return await this.itemModel.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (page - 1) * limit,
            limit
        });
    }

    async findAllItemsByType(type, options = {}) {
        return await this.itemModel.findAll({
            where: { type, ...options.where },
            ...options
        });
    }

    async removeAllItemsByType(type) {
        return await this.itemModel.destroy({
            where: { type }
        });
    }

    async removeAllAssignments() {
        return await this.assignmentModel.destroy({ where: {} });
    }

    async removeAllRules() {
        return await this.ruleModel.destroy({ where: {} });
    }

    async removeAllItemChildren() {
        return await this.itemChildModel.destroy({ where: {} });
    }

    async removeAllData() {
        await this.removeAllItemChildren();
        await this.removeAllAssignments();
        await this.removeAllRules();
        const count = await this.itemModel.destroy({ where: {} });
        return count;
    }

    async getRolesByUser(userId) {
        const assignments = await this.assignmentModel.findAll({
            where: { user_id: String(userId) }
        });
        const itemNames = assignments.map(a => a.item_name);
        if (itemNames.length === 0) return [];
        return await this.itemModel.findAll({
            where: { name: { [Op.in]: itemNames }, type: 1 }
        });
    }

    async getPermissionsByUser(userId) {
        return await this.getUserPermissions(userId);
    }

    async getPermissionsByRole(roleName) {
        const descendantNames = await this.getDescendantNames(roleName);
        const allNames = [roleName, ...descendantNames];

        return await this.itemModel.findAll({
            where: { name: { [Op.in]: allNames }, type: 2 }
        });
    }

    async getAssignmentsByUser(userId) {
        return await this.assignmentModel.findAll({
            where: { user_id: String(userId) }
        });
    }

    async getAssignmentsByItem(itemName) {
        return await this.assignmentModel.findAll({
            where: { item_name: itemName }
        });
    }

    async findUsersByRole(roleName) {
        const assignments = await this.assignmentModel.findAll({
            where: { item_name: roleName }
        });
        const userIds = [...new Set(assignments.map(a => a.user_id))];
        if (userIds.length === 0) return [];
        return await User.findAll({
            where: { id: { [Op.in]: userIds } }
        });
    }
}

module.exports = new RbacRepository();