const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../../../shared/middleware/auth.middleware');
const IC = require('../controllers/index.controller');

router.get('/', isAuthenticated, IC.renderIndex);
router.get('/help', isAuthenticated, IC.renderHelp);

module.exports = router;