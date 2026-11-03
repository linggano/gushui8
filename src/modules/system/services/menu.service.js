const MenuRepository = require('./../repositories/menu.repository');
const AuditService = require('./audit.service');

class MenuService {
    constructor() {
        this.repo = MenuRepository;
    }

    async getAllMenus(page, pageSize, parentId) {
        return await this.repo.findAllMenus(page, pageSize, parentId);
    }

    async getParentMenus() {
        return await this.repo.findAllMenus(1, 1000, null);
    }

    async getMenuByName(name) {
        return await this.repo.findMenuByName(name);
    }

    async createMenu(req, menuData) {
        const created = await this.repo.createMenu(menuData);
        await AuditService.log(req, {
            module: 'system',
            actionType: 'create',
            targetType: 'Menu',
            targetId: created.id,
            description: `创建菜单: ${menuData.name}`,
            newValues: menuData,
            severity: 'info'
        });
        return created;
    }

    async updateMenu(req, name, updates) {
        const oldMenu = await this.repo.findMenuByName(name);
        await this.repo.updateMenu(name, updates);
        await AuditService.log(req, {
            module: 'system',
            actionType: 'update',
            targetType: 'Menu',
            targetId: name,
            description: `更新菜单: ${name}`,
            oldValues: oldMenu ? oldMenu.toJSON() : null,
            newValues: { ...oldMenu?.toJSON(), ...updates },
            severity: 'info'
        });
        return true;
    }

    async deleteMenu(req, name) {
        const menu = await this.repo.findMenuByName(name);
        if (!menu) throw new Error('菜单不存在');
        await this.repo.deleteMenu(name);
        await AuditService.log(req, {
            module: 'system',
            actionType: 'delete',
            targetType: 'Menu',
            targetId: name,
            description: `删除菜单: ${name}`,
            oldValues: menu.toJSON(),
            severity: 'warning'
        });
        return true;
    }

    async getMenuTree() {
        const allMenus = await this.repo.findAll();
        return this.buildTree(allMenus);
    }

    buildTree(menus, parentId = null) {
        return menus
            .filter(m => m.parent === parentId)
            .map(m => ({
                ...m.toJSON(),
                children: this.buildTree(menus, m.id)
            }));
    }
}

module.exports = new MenuService();
