const { seedRbac } = require('./rbac.seed');

async function runSeeders() {
    console.log('🌱 正在执行数据种子...');
    try {
        await seedRbac();
        console.log('✅ 所有种子数据执行完毕');
    } catch (err) {
        console.error('❌ 种子数据执行失败:', err.message);
        throw err;
    }
}

module.exports = { runSeeders };