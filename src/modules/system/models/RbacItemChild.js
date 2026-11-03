const { DataTypes, Model } = require('sequelize');

const TYPE_ROLE = 1;
const TYPE_PERMISSION = 2;
const TYPE_ROUTE = 3;

const TYPE_MAP = {
    [TYPE_ROLE]: '角色',
    [TYPE_PERMISSION]: '权限',
    [TYPE_ROUTE]: '路由'
};

module.exports = (sequelize) => {
    class RbacItemChild extends Model {
        static async validateParentChild(parent, child) {
            const parentType = parent.type || parent.getDataValue('type');
            const childType = child.type || child.getDataValue('type');

            if (!parentType || !childType) {
                throw new Error('父项或子项类型不能为空');
            }

            if (parentType > childType) {
                throw new Error(`无效的父子关系: ${TYPE_MAP[parentType]} 不能是 ${TYPE_MAP[childType]} 的父级`);
            }

            if (await this.checkCircularReference(parent, child)) {
                throw new Error('检测到循环引用');
            }

            return true;
        }

        static async checkCircularReference(parent, child) {
            const childName = child.name || child.getDataValue('name');
            const parentName = parent.name || parent.getDataValue('name');

            if (childName === parentName) return true;

            const queue = [childName];
            const visited = new Set();

            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);

                const children = await RbacItemChild.findAll({
                    where: { parent: current }
                });

                for (const rel of children) {
                    if (rel.child === parentName) return true;
                    queue.push(rel.child);
                }
            }

            return false;
        }

        static async getDescendants(name) {
            const result = new Map();
            const queue = [name];
            const visited = new Set();

            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);

                const children = await RbacItemChild.findAll({
                    where: { parent: current }
                });

                for (const rel of children) {
                    if (!result.has(rel.child)) {
                        result.set(rel.child, rel);
                    }
                    queue.push(rel.child);
                }
            }

            return [...result.values()];
        }

        static async getAncestors(name) {
            const result = new Map();
            const queue = [name];
            const visited = new Set();

            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);

                const parents = await RbacItemChild.findAll({
                    where: { child: current }
                });

                for (const rel of parents) {
                    if (!result.has(rel.parent)) {
                        result.set(rel.parent, rel);
                    }
                    queue.push(rel.parent);
                }
            }

            return [...result.values()];
        }
    }

    RbacItemChild.TYPE_ROLE = TYPE_ROLE;
    RbacItemChild.TYPE_PERMISSION = TYPE_PERMISSION;
    RbacItemChild.TYPE_ROUTE = TYPE_ROUTE;
    RbacItemChild.TYPE_MAP = TYPE_MAP;

    RbacItemChild.init({
        parent: {
            type: DataTypes.STRING(64),
            primaryKey: true
        },

        child: {
            type: DataTypes.STRING(64),
            primaryKey: true
        }
    }, {
        sequelize,
        modelName: 'RbacItemChild',
        tableName: 'rbac_item_child',
        timestamps: false,
        indexes: [],
    });

    return RbacItemChild;
};