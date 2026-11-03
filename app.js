// 加载环境变量（必须在所有其他 require 之前）
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const flash = require('connect-flash');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const {
    ForbiddenError,
} = require('./src/shared/utils/errors');
const { notFoundHandler, globalErrorHandler } = require('./src/shared/utils/errorHandler');
const { sequelize } = require('./src/shared/database');
const { rbacContext, createGlobalAuthGuard } = require('./src/shared/middleware/rbac.middleware');

const app = express();

// 加载安全配置文件
const securityConfig = require('./src/config/security');

// 加载应用配置文件
const appConfig = require('./src/config/app');

// ============================================================
// 0. 数据库连接
// ============================================================
sequelize.authenticate()
    .then(() => console.log('数据库连接成功'))
    .catch(err => console.error('数据库连接失败:', err));

// ============================================================
// 1. 视图引擎
// ============================================================
const viewsDirs = [path.join(__dirname, 'src', 'views')];
const modulesDir = path.join(__dirname, 'src', 'modules');
if (fs.existsSync(modulesDir)) {
    fs.readdirSync(modulesDir).forEach(moduleName => {
        const moduleViews = path.join(modulesDir, moduleName, 'views');
        if (fs.existsSync(moduleViews)) viewsDirs.push(moduleViews);
    });
}
app.set('views', viewsDirs);
app.set('view engine', 'pug');
app.locals.basedir = path.join(__dirname, 'src', 'views');

// ============================================================
// 2. 请求体解析（必须在路由之前）
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 3. 日志
// ============================================================
if (appConfig.log.enableConsole) {
    app.use(morgan('dev'));
}

if (appConfig.log.enableFile) {
    if (!fs.existsSync(appConfig.log.dir)) {
        fs.mkdirSync(appConfig.log.dir, { recursive: true });
    }
    const accessLogStream = fs.createWriteStream(
        path.join(appConfig.log.dir, 'access.log'),
        { flags: 'a' }
    );
    app.use(morgan('combined', { stream: accessLogStream }));
}

// ============================================================
// 4. 静态资源
// ============================================================
const { uploadAccessControl } = require('./src/shared/middleware/response.middleware');
// 放在 static 之前，先拦截再服务
app.use('/uploads', uploadAccessControl, express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/npm', express.static(path.join(__dirname, 'node_modules')));

// ============================================================
// 5. 会话层（session / flash / response）
// ============================================================
app.use(cookieParser());

app.use(session({
    store: new SQLiteStore(securityConfig.session.store),
    secret: securityConfig.session.secret,
    resave: securityConfig.session.resave,
    saveUninitialized: securityConfig.session.saveUninitialized,
    cookie: securityConfig.session.cookie,
    name: securityConfig.session.name
}));

app.use(flash());

// 响应辅助方法
app.use(function(req, res, next) {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.warning = req.flash('warning');
    res.locals.currentUrl = req.originalUrl;
    next();
});

// ============================================================
// 6. 安全层（基础安全中间件）
// ============================================================
// 基础安全头
app.use(function(req, res, next) {
    Object.entries(securityConfig.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
    });
    next();
});

// CSRF令牌生成中间件
function generateCsrfToken(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = securityConfig.crypto.generateToken(securityConfig.csrf.tokenLength);
    }
    return req.session.csrfToken;
}

app.use(function(req, res, next) {
    res.locals.csrfToken = generateCsrfToken(req);
    next();
});

// CSRF验证中间件
function csrfProtection(req, res, next) {
    if (securityConfig.csrf.safeMethods.includes(req.method)) {
        return next();
    }

    const sources = securityConfig.csrf.tokenSources;
    const token = req.headers[sources.header] ||
        req.body[sources.body] ||
        req.query[sources.query];

    if (!token || token !== req.session.csrfToken) {
        return next(new ForbiddenError(securityConfig.csrf.errorMessage));
    }

    next();
}

// ============================================================
// 7. RBAC 上下文注入 & 全局访问控制（在路由之前）
// ============================================================
app.use(rbacContext);
app.use(createGlobalAuthGuard(securityConfig));

// 根路径重定向
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/home');
    }
    res.redirect('/auth/login');
});

// ============================================================
// 8. 路由
// ============================================================
const modelRouter = require('./src/modules');
app.use('/', modelRouter);

// ============================================================
// 9. 错误处理（最后）
// ============================================================
// catch 404 and forward to error handler
app.use(notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(globalErrorHandler);

module.exports = app;