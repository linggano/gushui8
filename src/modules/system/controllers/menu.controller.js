const MenuService = require('../services/menu.service');
const RbacService = require('../services/rbac.service');
const { getPagination, buildPaginationView } = require('../../../shared/utils/pagination');

class MenuController {
    renderMenuList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const parentId = req.query.parent || '';

        const menus = await MenuService.getAllMenus(page, pageSize, parentId || null);
        const routesResult = await RbacService.getRoutes();
        const parentMenus = await MenuService.getParentMenus();
        const parentOptions = parentMenus.rows.map(menu => ({
            value: menu.id,
            label: menu.name
        }));

        res.render('system/menu/index', {
            title: '菜单管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: '菜单管理', href: '/system/menus' }
            ],
            menus: menus.rows,
            routes: routesResult,
            parentMenus: parentOptions,
            filters: { parent: parentId },
            query: { parent: parentId },
            pagination: buildPaginationView(menus, { page, pageSize }, '/system/menus')
        });
    };

    createMenu = async (req, res) => {
        try {
            await MenuService.createMenu(req, req.body);
            res.json({ success: true, message: '菜单创建成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updateMenu = async (req, res) => {
        try {
            await MenuService.updateMenu(req, req.params.name, req.body);
            res.json({ success: true, message: '菜单更新成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deleteMenu = async (req, res) => {
        try {
            await MenuService.deleteMenu(req, req.params.name);
            res.json({ success: true, message: '菜单删除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    getMenuTree = async (req, res) => {
        const tree = await MenuService.getMenuTree();
        res.json({ success: true, data: tree });
    };
}

module.exports = new MenuController();