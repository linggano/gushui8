const express = require('express');
const router = express.Router();

const MC = require('../controllers/menu.controller');

router.route('/')
    .get(MC.renderMenuList)
    .post(MC.createMenu);

router.get('/tree', MC.getMenuTree);

router.route('/:name')
    .put(MC.updateMenu)
    .delete(MC.deleteMenu);

module.exports = router;
