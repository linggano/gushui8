const RbacService = require('../services/rbac.service');
const UserRepository = require('../../users/repositories/user.repository');
const { scanRoutes } = require('../../../shared/utils/routeScanner');
const appConfig = require('../../../config/app');
const { Menu } = require('../../../shared/database');
const { getPagination, buildPaginationView } = require('../../../shared/utils/pagination');

const TYPE_ROLE = 1;
const TYPE_PERMISSION = 2;
const TYPE_ROUTE = 3;

class RbacController {

    // ==========================================================
    // Dashboard
    // ==========================================================

    renderDashboard = async (req, res) => {
        const roles = await RbacService.getRoles();
        const permissions = await RbacService.getPermissions();
        const routes = await RbacService.getRoutes();
        const rules = await RbacService.getRules();
        const userCount = await UserRepository.model.count();

        res.render('system/rbac/index', {
            title: 'RBAC 权限管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' }
            ],
            employeeCount: userCount,
            roleCount: Array.isArray(roles) ? roles.length : (roles.count || 0),
            permissionCount: Array.isArray(permissions) ? permissions.length : (permissions.count || 0),
            routeCount: Array.isArray(routes) ? routes.length : (routes.count || 0),
            rulesMeta: Array.isArray(rules) ? rules : (rules.rows || [])
        });
    };

    // ==========================================================
    // Roles
    // ==========================================================

    renderRoleList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const search = req.query.search || '';

        const roles = await RbacService.getRoles({ page, limit: pageSize, search });
        const rules = await RbacService.getRules();

        res.render('system/rbac/roles', {
            title: '角色管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '角色管理', href: '/system/rbac/roles' }
            ],
            roles,
            rules: Array.isArray(rules) ? rules : (rules.rows || []),
            pagination: buildPaginationView(
                { count: roles.count || (Array.isArray(roles) ? roles.length : 0), rows: roles.rows || [] },
                { page, pageSize },
                '/system/rbac/roles'
            )
        });
    };

    createRole = async (req, res) => {
        try {
            const { name, description, rule_name, data } = req.body;
            await RbacService.createRole(name, description, rule_name || null, data || {});
            res.json({ success: true, message: '角色创建成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updateRole = async (req, res) => {
        try {
            await RbacService.updateItem(req.params.name, req.body);
            res.json({ success: true, message: '角色更新成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deleteRole = async (req, res) => {
        try {
            await RbacService.removeItem(req.params.name);
            res.json({ success: true, message: '角色删除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Role Permissions (角色权限分配页面)
    // ==========================================================

    renderRolePermissions = async (req, res) => {
        const roleName = req.params.name;
        const role = await RbacService.getRole(roleName);

        const children = await RbacService.getChildren(roleName);
        const descendants = await RbacService.getDescendants(roleName);
        const childNames = children.map(c => c.name);
        const descendantNames = descendants.map(d => d.name);
        const selected = [...new Set([...childNames, ...descendantNames])];

        const tree = await this._buildFullTree(roleName);
        const childrenTree = await this._buildChildrenTree(roleName);
        const roleMenus = await this._buildRoleMenuTree(roleName, children, descendants);

        res.render('system/rbac/role-permissions', {
            title: `${role.name} - 角色权限`,
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '角色管理', href: '/system/rbac/roles' },
                { label: `${role.name} 权限`, href: '#' }
            ],
            role,
            childrenTree,
            tree,
            selected,
            roleMenus
        });
    };

    getRoleChildren = async (req, res) => {
        try {
            const roleName = req.params.name;
            const children = await RbacService.getChildren(roleName);
            const childrenTree = await this._buildChildrenTree(roleName);
            res.json({ success: true, data: childrenTree || children });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Permissions
    // ==========================================================

    renderPermissionList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const search = req.query.search || '';

        const permissions = await RbacService.getPermissions({ page, limit: pageSize, search });
        const rules = await RbacService.getRules();

        const permArray = Array.isArray(permissions) ? permissions : (permissions.rows || []);

        res.render('system/rbac/permissions', {
            title: '权限管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '权限管理', href: '/system/rbac/permissions' }
            ],
            permissions: permArray.map(p => ({
                name: p.name,
                description: p.description || '-',
                rule_name: p.rule_name || '-',
                data: p.data || null
            })),
            rules: Array.isArray(rules) ? rules : (rules.rows || []),
            pagination: buildPaginationView(
                { count: permissions.count || permArray.length, rows: permArray },
                { page, pageSize },
                '/system/rbac/permissions'
            )
        });
    };

    createPermission = async (req, res) => {
        try {
            const { name, description, rule_name, data } = req.body;
            await RbacService.createPermission(name, description, rule_name || null, data || {});
            res.json({ success: true, message: '权限创建成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updatePermission = async (req, res) => {
        try {
            await RbacService.updateItem(req.params.name, req.body);
            res.json({ success: true, message: '权限更新成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deletePermission = async (req, res) => {
        try {
            await RbacService.removeItem(req.params.name);
            res.json({ success: true, message: '权限删除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Permission Routes (权限路由分配页面)
    // ==========================================================

    renderPermissionRoutes = async (req, res) => {
        const permName = req.params.name;
        const permission = await RbacService.getPermission(permName);
        const allRoutes = await RbacService.getRoutes();

        const routesArray = Array.isArray(allRoutes) ? allRoutes : (allRoutes.rows || []);
        const children = await RbacService.getChildren(permName);
        const assignedRouteNames = children.map(c => c.name);

        const assignedRoutes = children.filter(c => c.type === TYPE_ROUTE);

        res.render('system/rbac/permission-routes', {
            title: `${permission.name} - 路由分配`,
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '权限管理', href: '/system/rbac/permissions' },
                { label: `${permission.name} 路由`, href: '#' }
            ],
            permission,
            assignedRoutes,
            routes: routesArray,
            selected: assignedRouteNames
        });
    };

    assignRoutesToPermission = async (req, res) => {
        try {
            const permName = req.params.name;
            let selectedRoutes = req.body.children;
            if (typeof selectedRoutes === 'string') {
                selectedRoutes = [selectedRoutes];
            } else if (!Array.isArray(selectedRoutes)) {
                selectedRoutes = [];
            }

            const currentChildren = await RbacService.getChildren(permName);
            const currentRouteNames = currentChildren
                .filter(c => c.type === TYPE_ROUTE)
                .map(c => c.name);

            const newRouteNames = selectedRoutes;

            const toAdd = newRouteNames.filter(n => !currentRouteNames.includes(n));
            const toRemove = currentRouteNames.filter(n => !newRouteNames.includes(n));

            for (const routeName of toAdd) {
                await RbacService.addChild(permName, routeName);
            }

            for (const routeName of toRemove) {
                await RbacService.removeChild(permName, routeName);
            }

            res.json({ success: true, message: '路由分配保存成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Hierarchy Management (父子关系)
    // ==========================================================

    addChild = async (req, res) => {
        try {
            const { parent, child } = req.body;
            await RbacService.addChild(parent, child);
            res.json({ success: true, message: '子项添加成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    removeChild = async (req, res) => {
        try {
            const { parent, child } = req.body;
            await RbacService.removeChild(parent, child);
            res.json({ success: true, message: '子项移除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Routes
    // ==========================================================

    renderRouteList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const search = req.query.search || '';

        const routes = await RbacService.getRoutes({ page, limit: pageSize, search });
        const routesArray = Array.isArray(routes) ? routes : (routes.rows || []);
        const allRoutes = Array.isArray(routes) ? routes : (await RbacService.getRoutes());

        const allRoutesArray = Array.isArray(allRoutes) ? allRoutes : (allRoutes.rows || []);
        const routeRows = routesArray.map(r => ({
            id: r.name,
            name: r.name,
            description: r.description || '-',
            data: r.data || null
        }));

        const dbRouteNames = new Set(allRoutesArray.map(r => r.name));
        const allowActions = (appConfig.rbac.accessControl.allowActions || [])
            .filter(p => p !== '*');
        const scannedRoutes = scanRoutes(req.app, { customExcludePaths: allowActions });
        const scanRows = scannedRoutes
            .map(sr => {
                const existingMethods = dbRouteNames.has(sr.path)
                    ? (allRoutesArray.find(r => r.name === sr.path)?.data?.method || ['GET'])
                    : [];
                const methodArr = Array.isArray(existingMethods) ? existingMethods : [existingMethods];
                return {
                    path: sr.path,
                    methods: sr.methods,
                    fullyExists: dbRouteNames.has(sr.path)
                        && sr.methods.every(m => methodArr.includes(m)),
                    existingMethods: methodArr
                };
            })
            .filter(r => !r.fullyExists);

        const stats = {
            total: scannedRoutes.length,
            routes: allRoutesArray.length,
            new: scanRows.length
        };

        console.log(`扫描到 ${scannedRoutes.length} 个路由，其中 ${stats.new} 个新路由`);

        res.render('system/rbac/routes', {
            title: '路由管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '路由管理', href: '/system/rbac/routes' }
            ],
            routeRows,
            scanRows,
            stats,
            pagination: buildPaginationView(
                { count: routes.count || routesArray.length, rows: routesArray },
                { page, pageSize },
                '/system/rbac/routes'
            )
        });
    };

    createRoute = async (req, res) => {
        try {
            const { name, description, data } = req.body;
            await RbacService.createRoute(name, description, data || {});
            res.json({ success: true, message: '路由创建成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updateRoute = async (req, res) => {
        try {
            await RbacService.updateItem(req.params.name, req.body);
            res.json({ success: true, message: '路由更新成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deleteRoute = async (req, res) => {
        try {
            await RbacService.removeItem(req.params.name);
            res.json({ success: true, message: '路由删除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    saveScannedRoutes = async (req, res) => {
        try {
            const { routes: selectedRoutes } = req.body;
            if (!selectedRoutes || !Array.isArray(selectedRoutes) || selectedRoutes.length === 0) {
                return res.status(400).json({ success: false, message: '请至少选择一条路由' });
            }
            await RbacService.saveScannedRoutes(selectedRoutes);
            res.json({ success: true, message: '路由保存成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Rules
    // ==========================================================

    renderRuleList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const search = req.query.search || '';

        const rules = await RbacService.getRules({ page, limit: pageSize, search });
        const rulesArray = Array.isArray(rules) ? rules : (rules.rows || []);

        res.render('system/rbac/rules', {
            title: '规则管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '规则管理', href: '/system/rbac/rules' }
            ],
            rules: rulesArray,
            pagination: buildPaginationView(
                { count: rules.count || rulesArray.length, rows: rulesArray },
                { page, pageSize },
                '/system/rbac/rules'
            )
        });
    };

    createRule = async (req, res) => {
        try {
            await RbacService.addRule(req.body);
            res.json({ success: true, message: '规则创建成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updateRule = async (req, res) => {
        try {
            await RbacService.updateRule(req.params.name, req.body);
            res.json({ success: true, message: '规则更新成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deleteRule = async (req, res) => {
        try {
            await RbacService.removeRule(req.params.name);
            res.json({ success: true, message: '规则删除成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Users
    // ==========================================================

    renderUserList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);

        const result = await UserRepository.findAndCountAll({
            page,
            limit: pageSize,
            order: [['created_at', 'DESC']]
        });

        const users = result.data || result.rows || [];

        res.render('system/rbac/users', {
            title: '用户管理',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '用户管理', href: '/system/rbac/users' }
            ],
            users,
            pagination: buildPaginationView(
                { count: result.total || result.count || users.length, rows: users },
                { page, pageSize },
                '/system/rbac/users'
            )
        });
    };

    renderUserDetail = async (req, res) => {
        const userId = req.params.id;
        const user = await UserRepository.findByPk(userId);
        if (!user) {
            req.flash('error', ['用户不存在']);
            return res.redirect('/system/rbac/users');
        }

        const roles = await RbacService.getRolesByUser(userId);
        const permissions = await RbacService.getPermissionsByUser(userId);

        res.render('system/rbac/user-detail', {
            title: `${user.realName || user.username} - 用户详情`,
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '系统管理', href: '/system' },
                { label: 'RBAC 权限管理', href: '/system/rbac' },
                { label: '用户管理', href: '/system/rbac/users' },
                { label: '用户详情', href: '#' }
            ],
            user,
            roles,
            permissions
        });
    };

    // ==========================================================
    // User API (AJAX)
    // ==========================================================

    getUserDetail = async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserRepository.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }
            const roles = await RbacService.getRolesByUser(userId);
            res.json({ success: true, data: { ...user.toJSON(), roles } });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    getUserRolesForAssign = async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserRepository.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            const assignedRoles = await RbacService.getRolesByUser(userId);
            const allRoles = await RbacService.getRoles();

            res.json({
                success: true,
                data: {
                    user: user.toJSON(),
                    roles: assignedRoles,
                    allRoles: Array.isArray(allRoles) ? allRoles : (allRoles.rows || [])
                }
            });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    assignRoleToUser = async (req, res) => {
        try {
            const userId = req.params.id;
            const { role_name } = req.body;
            if (!role_name) {
                return res.status(400).json({ success: false, message: '角色名称不能为空' });
            }

            const user = await UserRepository.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            await RbacService.assign(role_name, userId);
            res.json({ success: true, message: '角色分配成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    revokeRoleFromUser = async (req, res) => {
        try {
            const userId = req.params.id;
            const { role_name } = req.body;
            if (!role_name) {
                return res.status(400).json({ success: false, message: '角色名称不能为空' });
            }

            await RbacService.revoke(role_name, userId);
            res.json({ success: true, message: '角色撤销成功' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    getUserPermissions = async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserRepository.findByPk(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: '用户不存在' });
            }

            const permissions = await RbacService.getPermissionsByUser(userId);
            res.json({
                success: true,
                data: {
                    user: user.toJSON(),
                    permissions
                }
            });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ==========================================================
    // Private Helpers
    // ==========================================================

    async _buildFullTree(excludeName) {
        const roles = await RbacService.getRoles();
        const permissions = await RbacService.getPermissions();
        const routes = await RbacService.getRoutes();

        const rolesArray = Array.isArray(roles) ? roles : (roles.rows || []);
        const permsArray = Array.isArray(permissions) ? permissions : (permissions.rows || []);
        const routesArray = Array.isArray(routes) ? routes : (routes.rows || []);

        return [
            ...rolesArray.filter(r => r.name !== excludeName),
            ...permsArray,
            ...routesArray
        ];
    }

    async _buildChildrenTree(parentName) {
        const children = await RbacService.getChildren(parentName);
        if (!children || children.length === 0) return [];

        const result = [];
        for (const child of children) {
            const subChildren = await this._buildChildrenTree(child.name);
            result.push({
                ...child.toJSON ? child.toJSON() : child,
                children: subChildren
            });
        }
        return result;
    }

    async _buildRoleMenuTree(roleName, children, descendants) {
        try {
            const allRoleItems = [...children, ...descendants];
            const roleRoutes = allRoleItems
                .filter(item => item.type === TYPE_ROUTE)
                .map(item => item.name);
            const itemsMap = new Map();
            allRoleItems.forEach(item => {
                const name = item.name || (item.toJSON && item.toJSON().name);
                if (name) itemsMap.set(name, item);
            });
            if (roleRoutes.length === 0 && itemsMap.size === 0) {
                return [];
            }

            const menus = await Menu.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
            const nodes = new Map();
            menus.forEach(m => {
                const data = typeof m.data === 'string' ? JSON.parse(m.data || '{}') : (m.data || {});
                nodes.set(m.id, {
                    id: m.id,
                    name: m.name,
                    parent: m.parent || null,
                    route: m.route || '#',
                    order: m.order || 0,
                    icon: data.icon || null,
                    description: data.description || null,
                    children: []
                });
            });

            const roots = [];
            nodes.forEach(node => {
                const parent = nodes.get(node.parent);
                if (parent) parent.children.push(node);
                else roots.push(node);
            });

            const filter = (list) => list.filter(n => {
                if (n.children.length > 0) {
                    n.children = filter(n.children);
                    return n.children.length > 0;
                }
                return this._menuRouteMatch(roleRoutes, itemsMap, n.route);
            });

            return filter(roots);
        } catch (e) {
            console.error('[RBAC] Failed to build role menu tree:', e.message);
            return [];
        }
    }

    _menuRouteMatch(routes, items, targetRoute) {
        if (!targetRoute || targetRoute === '#') return true;
        const target = String(targetRoute).replace(/\/+$/, '');
        if ((routes || []).some(r => {
            const cur = String(r).replace(/\/+$/, '');
            if (cur === target) return true;
            if (cur.endsWith('/*')) {
                const base = cur.slice(0, -2);
                return target === base || target.startsWith(base + '/');
            }
            if (cur.endsWith('*')) {
                const base = cur.slice(0, -1);
                return target.startsWith(base);
            }
            return false;
        })) return true;
        if (items) {
            for (const item of items.values()) {
                const name = item.name || '';
                if (name === '*') return true;
                if (name === target) return true;
                if (name.endsWith('.*')) {
                    const prefix = name.slice(0, -2);
                    if (target === prefix || target.startsWith(prefix + '.')) return true;
                }
                if (name.endsWith('/*')) {
                    const base = name.slice(0, -2);
                    if (target === base || target.startsWith(base + '/')) return true;
                }
            }
        }
        return false;
    }

    }

module.exports = new RbacController();