const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class RbacRule extends Model {
        // 转换为JSON格式
        toJSON() {
            const values = super.toJSON();
            return values;
        }
    }
    
    RbacRule.init({
        name: {
            type: DataTypes.STRING(64),
            primaryKey: true,
            validate: {
                len: [2, 64]
            }
        },

        description: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '规则描述'
        },
        
        data: {
            type: DataTypes.BLOB,
            get() {
                const rawValue = this.getDataValue('data');
                if (!rawValue) return {};
                if (typeof rawValue === 'object' && !Buffer.isBuffer(rawValue)) return rawValue;
                try {
                    const str = Buffer.isBuffer(rawValue) ? rawValue.toString('utf8') : rawValue;
                    return JSON.parse(str);
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
        modelName: 'RbacRule',
        tableName: 'rbac_rule',
        timestamps: false,
        indexes: [],
    });
    
    return RbacRule;
};