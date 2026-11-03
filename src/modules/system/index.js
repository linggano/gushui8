const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../../shared/middleware/auth.middleware');
const { requirePermission } = require('../../shared/middleware/rbac.middleware');

router.subModules = [
    { prefix: '/',          router: require('./routes/system.route') },
    { prefix: '/auditLog',  router: require('./routes/auditLog.route') },
    { prefix: '/menus',     router: require('./routes/menu.route') },
    { prefix: '/rbac',      router: require('./routes/rbac.route') },
    { prefix: '/sessions',  router: require('./routes/session.route') },
];

router.subModules.forEach(({ prefix, router: moduleRouter }) => {
    router.use(prefix, isAuthenticated, requirePermission('system_manage'), moduleRouter);
});

module.exports = router;