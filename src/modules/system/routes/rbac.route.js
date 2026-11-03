const express = require('express');
const router = express.Router();

const RV = require('../validators/rbac.validator');
const validate = require('../../../shared/utils/validate');
const RC = require('../controllers/rbac.controller');

// ==========================================================
// Dashboard
// ==========================================================
router.get('/', RC.renderDashboard);

// ==========================================================
// Roles
// ==========================================================
router.route('/roles')
    .get(RC.renderRoleList)
    .post(RV.createRoleRules(), validate, RC.createRole);

router.get('/roles/:name/children', RC.getRoleChildren);
router.get('/roles/:name/permissions', RC.renderRolePermissions);

router.route('/roles/:name')
    .put(RV.updateRoleRules(), validate, RC.updateRole)
    .delete(RV.deleteItemRules(), validate, RC.deleteRole);

// ==========================================================
// Permissions
// ==========================================================
router.route('/permissions')
    .get(RC.renderPermissionList)
    .post(RV.createPermissionRules(), validate, RC.createPermission);

router.get('/permissions/assign-routes/:name', RC.renderPermissionRoutes);
router.post('/permissions/assign-routes/:name', RV.assignRoutesToPermissionRules(), validate, RC.assignRoutesToPermission);

router.route('/permissions/:name')
    .put(RV.updatePermissionRules(), validate, RC.updatePermission)
    .delete(RV.deleteItemRules(), validate, RC.deletePermission);

// ==========================================================
// Hierarchy Management (父子关系)
// ==========================================================
router.route('/items/children')
    .post(RV.addChildRules(), validate, RC.addChild)
    .delete(RV.removeChildRules(), validate, RC.removeChild);

// ==========================================================
// Routes
// ==========================================================
router.route('/routes')
    .get(RC.renderRouteList)
    .post(RV.createRouteRules(), validate, RC.createRoute);

router.post('/routes/scan-save', RV.saveScannedRoutesRules(), validate, RC.saveScannedRoutes);

router.route('/routes/:name')
    .put(RV.updateRouteRules(), validate, RC.updateRoute)
    .delete(RV.deleteItemRules(), validate, RC.deleteRoute);

// ==========================================================
// Rules
// ==========================================================
router.route('/rules')
    .get(RC.renderRuleList)
    .post(RV.createRuleRules(), validate, RC.createRule);

router.route('/rules/:name')
    .put(RV.updateRuleRules(), validate, RC.updateRule)
    .delete(RV.deleteRuleRules(), validate, RC.deleteRule);

// ==========================================================
// Users
// ==========================================================
router.get('/users', RC.renderUserList);
router.get('/users/:id', RC.renderUserDetail);

// ==========================================================
// User API (AJAX)
// ==========================================================
router.get('/api/users/:id', RC.getUserDetail);
router.get('/api/users/:id/roles', RC.getUserRolesForAssign);
router.post('/api/users/:id/roles/assign', RV.assignRoleToUserRules(), validate, RC.assignRoleToUser);
router.post('/api/users/:id/roles/remove', RV.revokeRoleFromUserRules(), validate, RC.revokeRoleFromUser);
router.get('/api/users/:id/permissions', RC.getUserPermissions);

module.exports = router;