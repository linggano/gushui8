const express = require('express');

const router = express.Router();

const modules = [
    { prefix: '/auth',          router: require('./auth/index') },
    { prefix: '/home',          router: require('./home/index') },
    { prefix: '/users',         router: require('./users/index') },
    { prefix: '/notifications', router: require('./notification/index') },
    { prefix: '/system',        router: require('./system/index') },
];

modules.forEach(({ prefix, router: moduleRouter }) => {
    router.use(prefix, moduleRouter);
    console.log(`[路由] 加载模块路由: ${prefix}`);
});

router.modules = modules;

module.exports = router;