const express = require('express');
const router = express.Router();

const IC = require('./../controllers/index.controller');

router.get('/', IC.renderUserIndex);

router.route('/settings')
    .post(IC.handlePreferenceSettings);

module.exports = router;