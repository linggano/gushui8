const {
    AppError,
    ValidationError,
    NotFoundError,
} = require('./errors');
const isApiRequest = require('./isApiRequest');

function normalizeError(err) {
    if (err instanceof AppError) return err;

    if (err.name === 'ValidationError') {
        return new ValidationError(err.message, err.details || err.errors || null);
    }

    if (err.type === 'entity.parse.failed') {
        return new ValidationError('请求体格式错误');
    }

    return err;
}

function notFoundHandler(req, res, next) {
    next(new NotFoundError(`路由不存在: ${req.method} ${req.path}`));
}

function globalErrorHandler(err, req, res, next) {
    const env = req.app.get('env') || 'development';
    const normalized = normalizeError(err);
    const isOperational = normalized instanceof AppError;
    const statusCode = isOperational ? normalized.statusCode : 500;

    if (!isOperational && env === 'production') {
        console.error('[UNEXPECTED ERROR]', err);
    } else {
        console.error('[ERROR]', err.message);
        if (env === 'development' && err.stack) {
            console.error(err.stack);
        }
    }

    if (isApiRequest(req)) {
        const response = {
            success: false,
            code: statusCode,
            message: isOperational ? normalized.message : (env === 'development' ? err.message : '服务器内部错误'),
        };
        if (isOperational && normalized.details) {
            response.details = normalized.details;
        }
        if (env === 'development' && !isOperational && err.stack) {
            response.stack = err.stack;
        }
        return res.status(statusCode).json(response);
    }

    res.locals.message = isOperational ? normalized.message : (env === 'development' ? err.message : '服务器内部错误');
    res.locals.error = env === 'development' ? err : {};
    res.locals.code = statusCode;

    const shouldFlash = statusCode === 401;
    if (shouldFlash) {
        req.flash('error', res.locals.message);
    }

    res.status(statusCode);
    const template = (req.session?.userId && res.locals.isAuthenticated) ? 'error' : 'error-plain';
    res.render(template);
}

module.exports = {
    isApiRequest,
    normalizeError,
    notFoundHandler,
    globalErrorHandler,
};