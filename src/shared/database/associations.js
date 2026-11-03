function defineAssociations(models) {
    const { User, UserProfile, UserIdentity, BiometricFeature, LoginLog, RbacAssignment, RbacItem } = models;

    if (User && UserProfile) {
        User.hasOne(UserProfile, {
            foreignKey: { name: 'user_id', allowNull: false },
            sourceKey: 'id',
            as: 'profile',
            onDelete: 'CASCADE',
        });
        UserProfile.belongsTo(User, {
            foreignKey: { name: 'user_id', allowNull: false },
            targetKey: 'id',
            as: 'user',
        });
    }

    if (User && UserIdentity) {
        User.hasOne(UserIdentity, {
            foreignKey: { name: 'id', allowNull: false },
            sourceKey: 'id',
            as: 'identity',
            onDelete: 'CASCADE',
        });
        UserIdentity.belongsTo(User, {
            foreignKey: { name: 'id', allowNull: false },
            targetKey: 'id',
            as: 'user',
        });
    }

    if (User && LoginLog) {
        User.hasMany(LoginLog, {
            foreignKey: { name: 'user_id', allowNull: true },
            sourceKey: 'id',
            as: 'loginLogs',
            onDelete: 'SET NULL',
        });
        LoginLog.belongsTo(User, {
            foreignKey: { name: 'user_id', allowNull: true },
            targetKey: 'id',
            as: 'user',
        });
    }

    if (RbacAssignment && RbacItem) {
        RbacAssignment.belongsTo(RbacItem, {
            foreignKey: { name: 'item_name', allowNull: false },
            targetKey: 'name',
            as: 'rbacItem',
        });
        RbacItem.hasMany(RbacAssignment, {
            foreignKey: { name: 'item_name', allowNull: false },
            sourceKey: 'name',
            as: 'assignments',
        });
    }
}

module.exports = defineAssociations;