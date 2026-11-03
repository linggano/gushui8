const BaseRepository = require('./../../../shared/database/repository');
const { Op } = require('sequelize');
const { User } = require('./../../../shared/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    async loginCheck({ identifier, password }) {
        if (!identifier || !password) return null;

        const isEmail = EMAIL_REGEX.test(identifier);
        const where = isEmail
            ? { email: identifier }
            : { username: identifier };

        const user = await this.findOne({ where });
        if (!user) return null;

        const valid = await user.comparePassword(password);
        return valid ? user : null;
    }

    async findByIdentifier(identifier) {
        if (!identifier) return null;

        const isEmail = EMAIL_REGEX.test(identifier);
        const where = isEmail
            ? { email: identifier }
            : { username: identifier };

        return await this.findOne({ where });
    }
}

module.exports = new UserRepository();