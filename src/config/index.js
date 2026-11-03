const app = require('./app');
const security = require('./security');

const config = {
    app,
    security,
    env: app.env,
    server: {
        host: '0.0.0.0',
        port: app.port,
        https: app.https,
    },
};

module.exports = { config, app, security };