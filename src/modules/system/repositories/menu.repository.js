const { Menu } = require("../../../shared/database");
const BaseRepository = require('../../../shared/database/repository');

class MenuRepository extends BaseRepository {
    constructor() {
        super(Menu);
    }

    async findAllMenus(page = 1, limit = 10, parentId = null) {
        const offset = (page - 1) * limit;
                                    const where = {};
                                    if (parentId !== null && parentId !== undefined && parentId !== '') {
                                        where.parent = parentId === 'root' ? null : Number(parentId);
                                    }
                                    return await this.model.findAndCountAll({
                                        where,
                                        order: [['order', 'ASC'], ['id', 'ASC']],
                                        limit: limit,
                                        offset: offset
                                    });
    }

    async findAll() {
        return await this.model.findAll({
            order: [['order', 'ASC'], ['id', 'ASC']]
        });
    }

    async findMenuByName(name) {
        return await this.model.findOne({
                                        where: { name }
                                    });
    }

    async createMenu(menuData) {
        return await this.model.create(menuData);
    }

    async updateMenu(name, updates) {
        const [affectedCount] = await this.model.update(updates, {
                                        where: { name }
                                    });
                                    return affectedCount > 0;
    }

    async deleteMenu(name) {
        const menuItem = await this.model.findOne({ where: { name } });
                                    if (!menuItem) return false;
                                    await menuItem.destroy();
                                    return true;
    }
}

module.exports = new MenuRepository();