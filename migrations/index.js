const { migrate: addUserColumns } = require('./addUserColumns.migration');

async function runMigrations(sequelize) {
    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = sequelize.Sequelize;

    const migrations = [
        { name: 'addUserColumns', fn: addUserColumns },
    ];

    console.log('📋 正在执行数据库迁移...');
    for (const migration of migrations) {
        try {
            await migration.fn(queryInterface, Sequelize);
            console.log(`  ✅ ${migration.name}`);
        } catch (err) {
            console.warn(`  ⚠️  ${migration.name} 跳过:`, err.message);
        }
    }
    console.log('✅ 数据库迁移完成');
}

module.exports = { runMigrations };