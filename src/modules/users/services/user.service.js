const UserRepository = require('../repositories/user.repository');

class UserService {
    constructor() {
        this.userRepository = UserRepository;
    }

    async loginCheck(payload) {
        return this.userRepository.loginCheck(payload);
    }

    async findAll(params) {
        return this.userRepository.findAll(params);
    }

    async findAndCountAll({ offset, pageSize: limit, ...rest } = {}) {
        return this.userRepository.model.findAndCountAll({ offset, limit, ...rest });
    }

    async findById(id) {
        return this.userRepository.findById(id);
    }

    async createUser(user) {
        return this.userRepository.create(user);
    }

    async updateHomeRoute(userId, homeRoute) {
        const user = await this.userRepository.findById(userId);
        if (!user) return null;
        return user.update({ home_route: homeRoute || null });
    }

    async unlockUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) return null;
        return user.update({ is_locked: false, locked_until: null, login_attempts: 0 });
    }

    async lockUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) return null;
        return user.update({ is_locked: true, locked_until: new Date(Date.now() + 30 * 60 * 1000) });
    }

    async deleteUser(userId) {
        return this.userRepository.destroy(userId);
    }

    async verifyUser(userId, verificationStatus) {
        const user = await this.userRepository.findById(userId);
        if (!user) return null;
        return user.update({ verificationStatus });
    }
}

module.exports = new UserService();