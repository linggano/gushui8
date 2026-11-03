const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../../shared/middleware/auth.middleware');

router.subModules = [
    { prefix: '/', router: require('./routes/users.route') },
    { prefix: '/:userId', router: require('./routes/index.route') },
];

router.subModules.forEach(({ prefix, router: moduleRouter }) => {
    router.use(prefix, isAuthenticated, moduleRouter);
});

module.exports = router;