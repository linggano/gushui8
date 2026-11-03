const BaseRepository = require('../../../shared/database/repository');
const { LoginLog, User } = require('../../../shared/database');

class LoginLogRepository extends BaseRepository {
    constructor() {
        super(LoginLog);
    }

    async findAllWithUser(options = {}) {
        return await this.findAll({
            ...options,
            include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        });
    }
}

module.exports = new LoginLogRepository();