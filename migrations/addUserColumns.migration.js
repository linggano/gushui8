async function migrate(queryInterface, Sequelize) {
    const userColumns = await queryInterface.describeTable('users');

    if (!userColumns.home_route) {
        await queryInterface.addColumn('users', 'home_route', {
            type: Sequelize.STRING(255),
            allowNull: true,
            defaultValue: null,
        });
        console.log('✅ 已添加 users.home_route 字段');
    }

    if (!userColumns.phone) {
        await queryInterface.addColumn('users', 'phone', {
            type: Sequelize.STRING(20),
            allowNull: true,
            unique: true,
        });
        console.log('✅ 已添加 users.phone 字段');
    }

    if (!userColumns.verification_status) {
        await queryInterface.addColumn('users', 'verification_status', {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'unverified',
        });
        console.log('✅ 已添加 users.verification_status 字段');
    }
}

module.exports = { migrate };