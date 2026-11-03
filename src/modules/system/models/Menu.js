const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes, Model) => {
    class Menu extends Model {
        // 获取子菜单
        async getChildren() {
            return await Menu.findAll({
                where: { parent: this.id },
                order: [['order', 'ASC']]
            });
        }
        
        // 获取父菜单
        async getParent() {
            if (!this.parent) return null;
            return await Menu.findByPk(this.parent);
        }
        
        // 转换为JSON
        toJSON() {
            const values = super.toJSON();
            return values;
        }
    }

    Menu.init({
        id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true,
            validate: {
                len: [1, 128]
            }
        },
        parent: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        route: {
            type: DataTypes.STRING(256),
            allowNull: true
        },
        order: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        data: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
            get() {
                const rawValue = this.getDataValue('data');
                if (typeof rawValue === 'string') {
                    try {
                        return JSON.parse(rawValue || '{}');
                    } catch (e) {
                        return {};
                    }
                }
                return rawValue || {};
            },
            set(value) {
                this.setDataValue('data', typeof value === 'object' ? JSON.stringify(value) : value);
            }
        }
    }, {
        sequelize,
        tableName: 'menu',
        timestamps: false,
        indexes: [
            {
                fields: ['parent']
            },
            {
                fields: ['order']
            }
        ]
    });

    return Menu;
};