const UserService = require('../../users/services/user.service');
const LoginLogService = require('../services/loginLog.service');
const Captcha = require('../../../shared/utils/captcha');
const { AuthError, ValidationError } = require('../../../shared/utils/errors');

class AuthController {

    constructor() {
        this.captcha = new Captcha();
    }

    // =========================================================================
    // 渲染登录表单 (GET)
    // =========================================================================
    renderLoginForm = (req, res) => {
        if (req.session.user && !req.session.userId) {
            delete req.session.user;
        }
        const { id, code, svg, expiresAt } = this.captcha.generate();
        req.session.captchaId = id;
        req.session.captchaCode = code;
        req.session.captchaExpiresAt = expiresAt;
        res.render('auth/login', {
            title: '登录', 
            captchaImage: svg,
        });
    };


    // renderRegisterForm = (req, res) => {
    //     res.render('auth/register', {
    //         title: '注册',
    //     });
    // };


    /**
     * 服务条款 页面 (GET)
     * @param {*} req
     * @param {*} res
     * @returns
     */
    renderTermsPage = (req, res) => {
        res.render('auth/terms', { title: '服务条款' });
    }

    renderLockScreenForm = async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        const user = await UserService.findById(req.session.userId);

        res.render('auth/lockScreen', {
            title: '屏幕锁定',
            user: user ? { username: user.username } : null,
            avatar: user ? user.avatar : null,
            nonce: '',
        });
    };

    lockScreen = (req, res) => {
        req.session.locked = true;
        req.session.lockReturnTo = req.query.return || req.get('Referer') || '/home';

        req.session.save((err) => {
            if (err) console.error('[LockScreen] Session save failed:', err.message);
            res.redirect('/auth/lockscreen');
        });
    };

    unlock = async (req, res) => {
        const { password } = req.body;

        if (!req.session.userId) {
            return res.json({ success: false, message: '会话已过期，请重新登录' });
        }

        const user = await UserService.findById(req.session.userId);

        if (!user) {
            return res.json({ success: false, message: '用户不存在' });
        }

        const valid = await user.comparePassword(password);

        if (!valid) {
            return res.json({ success: false, message: '密码错误，请重试' });
        }

        delete req.session.locked;
        const redirectUrl = req.session.lockReturnTo || '/home';
        delete req.session.lockReturnTo;

        return res.json({ success: true, redirect: redirectUrl, message: '已解锁，欢迎回来' });
    };

    // =========================================================================
    // 后台数据处理
    // =========================================================================
    /**
     * 获取验证码 (GET)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    getCaptcha = async (req, res) => {
        const { id, code, svg, expiresAt } = this.captcha.generate();
        req.session.captchaId = id;
        req.session.captchaCode = code;
        req.session.captchaExpiresAt = expiresAt;
        res.json({
            id,
            svg,
            expiresAt
        });
    }

    /**
     * 触发锁屏 处理 (GET)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    triggerLock = (req, res) => {
        if (!req.session.user) {
            return res.redirect('/auth/login');
        }
        if (!req.session.locked) {
            req.session.locked = { lockedAt: new Date().toISOString() };
        }
        // 前端通过 ?return= 传递当前路由；兼容旧的 ?from= 参数
        // 如果没有传路由，使用当前默认 '/'，保留之前已经存好的路由
        if (typeof req.query.return !== 'undefined' && req.query.return !== '') {
            req.session.locked.returnTo = req.query.return;
        } else if (typeof req.query.from !== 'undefined' && req.query.from !== '') {
            req.session.locked.returnTo = req.query.from;
        } else if (!req.session.locked.returnTo) {
            req.session.locked.returnTo = '/';
        }
        res.redirect('/auth/lockscreen');
    }

    /**
     * 登录 (POST)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    login = async (req, res) => {
        const { identifier, password_hash } = req.body;

        const user = await UserService.loginCheck({
            identifier: identifier?.trim(),
            password: password_hash,
        });

        if (!user) {
            throw new AuthError('用户名/邮箱或密码错误');
        }

        if (user.status === 0) {
            throw new AuthError('该账号已被禁用，请联系管理员');
        }

        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        await user.update({ last_login_at: new Date(), last_login_ip: clientIp });
        await LoginLogService.create({
            user_id: user.id,
            ip_address: clientIp,
            user_agent: req.headers['user-agent'],
        });

        req.session.userId = user.id;
        req.session.userAgent = req.headers['user-agent'];

        const redirectUrl = req.session.returnTo || '/home';
        delete req.session.returnTo;

        req.flash('success', '登录成功');
        res.redirect(redirectUrl);
    };

    /**
     * 锁屏 处理 (POST)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    unlockScreen = async (req, res) => {
        const { password } = req.body;
        const userId = req.session.userId;
        if (!userId) {
            return res.redirect('/auth/login');
        }
        try {
            await authService.unlockScreen(userId, password);
            const redirectTo = req.session.locked?.returnTo || '/dashboard';
            delete req.session.locked;
            req.flash('success', ['欢迎回来']);
            
            // 支持 AJAX 请求，返回 JSON 供前端处理跳转
            if (req.xhr || req.accepts('json')) {
                return res.json({ success: true, redirect: redirectTo });
            }
            
            return res.redirect(redirectTo);
        } catch (err) {
            req.flash('error', [err.message || '密码错误']);
            
            // 支持 AJAX 请求，返回 JSON 错误
            if (req.xhr || req.accepts('json')) {
                return res.status(401).json({ success: false, message: err.message || '密码错误' });
            }
            
            return res.redirect('/auth/lockscreen');
        }
    }
    
    logout = (req, res) => {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/auth/login');
        });
    };

}

module.exports = new AuthController();