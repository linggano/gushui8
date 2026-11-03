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
    class RbacItem extends Model {
        getChildren() {
            return this.getChildItems();
        }

        getParents() {
            return this.getParentItems();
        }

        get typeName() {
            return TYPE_MAP[this.type] || '未知';
        }

        get isRole() {
            return this.type === TYPE_ROLE;
        }

        get isPermission() {
            return this.type === TYPE_PERMISSION;
        }

        get isRoute() {
            return this.type === TYPE_ROUTE;
        }

        canBeParentOf(childType) {
            if (this.type === TYPE_ROLE && [TYPE_ROLE, TYPE_PERMISSION, TYPE_ROUTE].includes(childType)) {
                return true;
            }
            if (this.type === TYPE_PERMISSION && [TYPE_PERMISSION, TYPE_ROUTE].includes(childType)) {
                return true;
            }
            return false;
        }

        toJSON() {
            const values = super.toJSON();
            values.typeName = this.typeName;
            values.isRole = this.isRole;
            values.isPermission = this.isPermission;
            values.isRoute = this.isRoute;
            return values;
        }
    }

    RbacItem.TYPE_ROLE = TYPE_ROLE;
    RbacItem.TYPE_PERMISSION = TYPE_PERMISSION;
    RbacItem.TYPE_ROUTE = TYPE_ROUTE;
    RbacItem.TYPE_MAP = TYPE_MAP;

    RbacItem.init({
        name: {
            type: DataTypes.STRING(64),
            primaryKey: true,
            unique: true,
            validate: {
                len: [1, 64]
            }
        },

        type: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            validate: {
                isIn: [[TYPE_ROLE, TYPE_PERMISSION, TYPE_ROUTE]]
            }
        },

        description: {
            type: DataTypes.TEXT
        },

        rule_name: {
            type: DataTypes.STRING(64)
        },

        data: {
            type: DataTypes.BLOB,
            defaultValue: Buffer.from('{}'),
            get() {
                const rawValue = this.getDataValue('data');
                if (!rawValue) return {};
                if (typeof rawValue === 'object' && !Buffer.isBuffer(rawValue)) return rawValue;
                try {
                    const str = Buffer.isBuffer(rawValue) ? rawValue.toString('utf8') : rawValue;
                    return typeof str === 'string' ? JSON.parse(str) : {};
                } catch (e) {
                    return {};
                }
            },
            set(value) {
                const data = typeof value === 'object' ? value : {};
                const jsonStr = JSON.stringify(data);
                this.setDataValue('data', Buffer.from(jsonStr, 'utf8'));
            }
        },

        created_at: {
            type: DataTypes.INTEGER,
            defaultValue: () => Date.now()
        },

        updated_at: {
            type: DataTypes.INTEGER,
            defaultValue: () => Date.now()
        }
    }, {
        sequelize,
        modelName: 'RbacItem',
        tableName: 'rbac_items',
        timestamps: false,

        hooks: {
            beforeValidate: (item) => {
                if (item.type === TYPE_ROUTE && item.name && !item.name.startsWith('/')) {
                    item.name = '/' + item.name;
                }
            },
            beforeUpdate: (item) => {
                item.updated_at = Date.now();
            }
        },

        indexes: [
            {
                unique: true,
                fields: ['name']
            },
            {
                fields: ['type']
            },
            {
                fields: ['rule_name']
            }
        ]
    });

    RbacItem.belongsToMany(RbacItem, {
        as: 'children',
        through: 'rbac_item_child',
        foreignKey: 'parent',
        otherKey: 'child',
        timestamps: false
    });

    RbacItem.belongsToMany(RbacItem, {
        as: 'parents',
        through: 'rbac_item_child',
        foreignKey: 'child',
        otherKey: 'parent',
        timestamps: false
    });

    return RbacItem;
};