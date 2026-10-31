// shared/utils/errors.js
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = '资源不存在') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

module.exports = { AppError, ValidationError, NotFoundError };