/**
 * @file   security.js
 * @path   src/config/security.js
 * @type   javascript
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const path = require('path');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';

const cryptoConfig = {
    tokenBytes: parseInt(process.env.CRYPTO_TOKEN_BYTES, 10) || 32,

    generateToken(bytes) {
        return crypto.randomBytes(bytes || this.tokenBytes).toString('hex');
    },

    generateBase64Token(bytes) {
        return crypto.randomBytes(bytes || this.tokenBytes).toString('base64');
    },

    generateBase64UrlToken(bytes) {
        return crypto.randomBytes(bytes || this.tokenBytes).toString('base64url');
    },
};

module.exports = {
    session: {
        name: process.env.SESSION_NAME || 'sid',
        secret: process.env.SESSION_SECRET || cryptoConfig.generateBase64Token(32),
        resave: false,
        saveUninitialized: false,
        store: {
            dir: path.resolve('database'),
            db: 'sessions.sqlite',
            table: 'sessions',
        },
        cookie: {
            httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
            secure: isProduction && process.env.SESSION_SECURE !== 'false',
            sameSite: (process.env.SESSION_SAME_SITE || 'strict'),
            maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 7 * 24 * 60 * 60 * 1000,
            path: process.env.COOKIE_PATH || '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
        },
    },

    cookie: {
        secret: process.env.COOKIE_SECRET || cryptoConfig.generateBase64Token(32),
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: process.env.COOKIE_PATH || '/',
    },

    csrf: {
        secret: process.env.CSRF_SECRET || cryptoConfig.generateBase64Token(32),
        tokenLength: 32,
        safeMethods: ['GET', 'HEAD', 'OPTIONS'],
        tokenSources: {
            header: 'x-csrf-token',
            body: '_csrf',
            query: '_csrf',
        },
        errorMessage: 'CSRF token verification failed',
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
        auth: {
            windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000,
            max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
        },
    },

    password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 6,
        saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS, 10) || 12,
        loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
        loginLockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES, 10) || 15,
    },

    crypto: cryptoConfig,

    headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        ...(isProduction && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
    },

    publicPaths: [
        '/auth/login',
        '/auth/captcha',
        '/assets',
        '/npm',
        '/favicon.ico',
    ],

    errorResponses: {
        unauthorized: {
            code: 401,
            message: '请先登录后再访问',
        },
        forbidden: {
            code: 403,
            message: '无权访问该资源',
        },
        notFound: {
            code: 404,
            message: '请求的资源不存在',
        },
    },
};