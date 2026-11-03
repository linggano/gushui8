const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class UserProfile extends Model {}

    UserProfile.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            comment: '主键ID'
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            comment: '用户ID'
        },
        former_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '曾用名'
        },
        marital_status: {
            type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
            allowNull: true,
            comment: '婚姻状况'
        },
        household_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '户口性质'
        },
        birth_place: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '出生地'
        },
        political_status: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '政治面貌'
        },
        social_security_card: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '社保卡号'
        },
        religion: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '宗教信仰'
        },
        height: {
            type: DataTypes.DECIMAL(5, 1),
            allowNull: true,
            comment: '身高(cm)'
        },
        blood_type: {
            type: DataTypes.ENUM('A', 'B', 'AB', 'O', 'unknown'),
            allowNull: true,
            comment: '血型'
        },
        education: {
            type: DataTypes.ENUM('primary', 'middle_school', 'high_school', 'college', 'bachelor', 'master', 'doctor'),
            allowNull: true,
            comment: '学历'
        },
        military_status: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '兵役状况'
        },
        occupation: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '职业'
        },
        hobbies: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '兴趣爱好'
        },
        workplace: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: '工作单位'
        },
        bank_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '开户行'
        },
        bank_account: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '银行账号'
        },
        social_connections: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '社交账号'
        },
        emergency_contact: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '紧急联系人姓名'
        },
        emergency_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '紧急联系人电话'
        },
        friend_contact: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '朋友联系人姓名'
        },
        friend_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '朋友联系人电话'
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
            comment: '资料审核状态 0=pending 1=confirmed 2=rejected',
            get() {
                const raw = this.getDataValue('status');
                const map = { 0: 'pending', 1: 'confirmed', 2: 'rejected' };
                return map[raw] || 'pending';
            },
            set(val) {
                const map = { pending: 0, confirmed: 1, rejected: 2, 0: 0, 1: 1, 2: 2 };
                this.setDataValue('status', map[val] !== undefined ? map[val] : 0);
            }
        },
        confirmed_by: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: '确认/驳回管理员ID'
        },
        confirmed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '审核时间'
        }
    }, {
        sequelize,
        modelName: 'UserProfile',
        tableName: 'user_profiles',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'], unique: true }
        ]
    });

    UserProfile.STATUS = {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        REJECTED: 'rejected'
    };

    return UserProfile;
};