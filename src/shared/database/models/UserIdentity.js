module.exports = (sequelize, DataTypes, Model) => {
    class UserIdentity extends Model {
        // 获取完整姓名
        getFullName() {
            const parts = [];
            if (this.last_name) parts.push(this.last_name);
            if (this.first_name) parts.push(this.first_name);
            return parts.join('');
        }

        // 检查身份证号是否有效
        isIdCardValid() {
            if (!this.id_card_number) return false;
            // 简单验证18位身份证
            return /^\d{17}[\dXx]$/.test(this.id_card_number);
        }

        // 安全JSON转换
        toSafeJSON() {
            const identity = this.toJSON();
            // 移除敏感信息
            delete identity.id_card_number;
            return identity;
        }
    }

    UserIdentity.init({
        id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            comment: '与User表ID一致'
        },

        last_name: {
            type: DataTypes.STRING(30),
            allowNull: true,
            comment: '姓'
        },

        first_name: {
            type: DataTypes.STRING(30),
            allowNull: true,
            comment: '名'
        },

        id_card_number: {
            type: DataTypes.STRING(18),
            allowNull: true,
            unique: true,
            comment: '身份证号码'
        },

        id_card_type: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'resident_id',
            comment: '证件类型：resident_id=居民身份证，passport=护照，other=其他'
        },

        gender: {
            type: DataTypes.ENUM('male', 'female'),
            allowNull: true,
            comment: '性别'
        },

        ethnicity: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '民族'
        },

        avatar: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '头像路径'
        },

        birth_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: '出生日期'
        },

        native_place: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '籍贯'
        },

        issuing_authority: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '签发机关'
        },

        valid_start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: '有效期限开始日期'
        },

        valid_end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: '有效期限结束日期'
        },

        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: '是否已验证'
        },

        verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '验证时间'
        },

        verified_by: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: '验证人（HR用户ID）'
        }

    }, {
        sequelize,
        modelName: 'UserIdentity',
        tableName: 'user_identities',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return UserIdentity;
};