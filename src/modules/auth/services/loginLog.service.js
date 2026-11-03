const LoginLogRepository = require('../repositories/loginLog.repository');

class LoginLogService {
    constructor() {
        this.repository = LoginLogRepository;
    }

    async create(data) {
        return await this.repository.create(data);
    }

    async findAll(options) {
        return await this.repository.findAll(options);
    }

    async findAllWithUser(options = {}) {
        return await this.repository.findAllWithUser(options);
    }

    async findAndCountByUserId(userId, options) {
        const where = { ...options.where, user_id: userId };
        return await this.repository.findAndCount({ ...options, where });
    }
}

module.exports = new LoginLogService();