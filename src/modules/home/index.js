const express = require('express');
const router = express.Router();

router.subModules = [
    { prefix: '/', router: require('./routes/index.route') },
];

router.subModules.forEach(({ prefix, router: moduleRouter }) => {
    router.use(prefix, moduleRouter);
});

module.exports = router;