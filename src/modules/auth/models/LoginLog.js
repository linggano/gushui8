module.exports = (sequelize, DataTypes, Model) => {
    class LoginLog extends Model {
        static associate(models) {
        }

        isSuccessful() {
            return this.success === true;
        }
    }

    LoginLog.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        },
        success: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        failure_reason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'failure_reason'
        }
    }, {
        sequelize,
        modelName: 'LoginLog',
        tableName: 'login_logs',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return LoginLog;
};