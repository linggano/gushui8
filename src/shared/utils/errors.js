class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = '参数校验失败', details = null) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

class AuthError extends AppError {
    constructor(message = '认证失败') {
        super(message, 401);
        this.name = 'AuthError';
    }
}

class ForbiddenError extends AppError {
    constructor(message = '权限不足') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

class NotFoundError extends AppError {
    constructor(message = '资源不存在') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = '资源冲突') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

class RateLimitError extends AppError {
    constructor(message = '请求过于频繁') {
        super(message, 429);
        this.name = 'RateLimitError';
    }
}

class ServerError extends AppError {
    constructor(message = '服务器内部错误') {
        super(message, 500);
        this.name = 'ServerError';
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ServerError,
};