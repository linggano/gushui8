var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');
var morgan = require('morgan');
var flash = require('connect-flash');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);

var app = express();

// 加载环境变量
require('dotenv').config();

// 加载安全配置文件
var securityConfig = require('./src/config/security');

// ============================================================
// 0. 数据库连接
// ============================================================
var { sequelize } = require('./shared');
sequelize.authenticate()
    .then(() => console.log('数据库连接成功'))
    .catch(err => console.error('数据库连接失败:', err));

sequelize.sync({ alter: true })
    .then(() => console.log('数据库模型同步完成'))
    .catch(err => console.error('数据库模型同步失败:', err));

// ============================================================
// 1. 视图引擎
// ============================================================
const viewsDirs = [path.join(__dirname, 'shared', 'views')];
const featuresDir = path.join(__dirname, 'features');
if (fs.existsSync(featuresDir)) {
    fs.readdirSync(featuresDir).forEach(moduleName => {
        const moduleViews = path.join(featuresDir, moduleName, 'views');
        if (fs.existsSync(moduleViews)) viewsDirs.push(moduleViews);
    });
}
app.set('views', viewsDirs);
app.set('view engine', 'pug');

app.use(logger('dev'));

// ============================================================
// 2. 请求体解析（必须在路由之前）
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ============================================================
// 3. 日志
// ============================================================
app.use(morgan('combined'));

// ============================================================
// 4. 静态资源
// ============================================================
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/npm', express.static(path.join(__dirname, 'node_modules')));

// ============================================================
// 5. 会话层（session / flash / response）
// ============================================================
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
        req.session.csrfToken = require('crypto')
            .randomBytes(securityConfig.csrf.tokenLength)
            .toString('hex');
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
        return next(createError(403, securityConfig.csrf.errorMessage));
    }

    next();
}

// ============================================================
// 7. CSRF 错误处理（在 csrf 之后，业务之前）
// ============================================================
app.use(function(err, req, res, next) {
    if (err.message && err.message.includes('CSRF')) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json(securityConfig.errorResponses.csrf.json);
        }
        req.flash('error', securityConfig.errorResponses.csrf.flash);
        return res.redirect('back');
    }
    next(err);
});

// ============================================================
// 8. RBAC 上下文注入（在业务之前，注入 res.locals）
// ============================================================
app.use(async function(req, res, next) {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.userRoles = [];
    res.locals.userPermissions = [];

    if (req.session && req.session.userId) {
        try {
            const { User } = require('./shared');
            const user = await User.findByPk(req.session.userId);
            if (user && user.status !== 0) {
                res.locals.user = user.toSafeJSON ? user.toSafeJSON() : user.toJSON();
                res.locals.isAuthenticated = true;

                const roles = await user.getRoles();
                res.locals.userRoles = roles.map(r => r.name);

                const permissions = await user.getPermissions();
                res.locals.userPermissions = permissions.map(p => p.name);
            }
        } catch (err) {
            console.error('RBAC上下文注入失败:', err);
        }
    }

    next();
});

// ============================================================
// 9. RBAC 全局访问控制（在路由之前）
// ============================================================
// 辅助方法：检查权限
app.use(function(req, res, next) {
    req.can = async function(permissionName) {
        if (!req.session || !req.session.userId) return false;
        try {
            const { User } = require('./shared');
            const user = await User.findByPk(req.session.userId);
            return user ? await user.can(permissionName) : false;
        } catch (err) {
            return false;
        }
    };

    req.hasRole = async function(roleName) {
        if (!req.session || !req.session.userId) return false;
        try {
            const { User } = require('./shared');
            const user = await User.findByPk(req.session.userId);
            return user ? await user.hasRole(roleName) : false;
        } catch (err) {
            return false;
        }
    };

    next();
});

// 全局路由访问控制中间件
app.use(async function(req, res, next) {
    const isPublic = securityConfig.publicPaths.some(path => req.path.startsWith(path));
    if (isPublic) return next();

    if (!req.session || !req.session.userId) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json(securityConfig.errorResponses.unauthorized.json);
        }
        req.flash('error', securityConfig.errorResponses.unauthorized.flash);
        return res.redirect(securityConfig.errorResponses.unauthorized.redirect);
    }

    next();
});

// ============================================================
// 10. 路由
// ============================================================
const featuresRouter = require('./features');
app.use('/', featuresRouter);

// ============================================================
// 11. 错误处理（最后）
// ============================================================
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
