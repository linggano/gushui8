const fs = require('fs');
const https = require('https');

const app = require('./app');
const { sequelize } = require('./src/shared/database');
const { config } = require('./src/config');

async function ensureColumns(table, expectedColumns) {
    try {
        const columns = await sequelize.getQueryInterface().describeTable(table);
        const missingColumns = expectedColumns.filter(col => !(col.name in columns));
        if (missingColumns.length > 0) {
            for (const col of missingColumns) {
                console.log(`  Adding column \`${table}\`.\`${col.name}\` (${col.type})`);
                await sequelize.getQueryInterface().addColumn(table, col.name, col);
            }
        }
    } catch (err) {
        console.error(`  检查表 ${table} 时出错:`, err.message);
    }
}

async function runMigrations() {
    try {
        const { runMigrations: executeMigrations } = require('./migrations');
        await executeMigrations(sequelize);
    } catch (err) {
        console.error('❌ 数据库迁移失败:', err.message);
    }
}

async function runSeeders() {
    try {
        const { runSeeders: executeSeeders } = require('./seeders');
        await executeSeeders();
    } catch (err) {
        console.error('❌ 种子数据执行失败:', err.message);
    }
}

async function bootstrap() {
    try {
        await sequelize.authenticate();
        console.log('✅ 数据库连接成功');
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }

    try {
        const tables = await sequelize.getQueryInterface().showAllTables();
        console.log(`📋 现有数据表: ${tables.join(', ') || '无'}`);

        // 检查 RBAC 核心表是否存在
        const rbacTables = ['rbac_assignment', 'rbac_items', 'rbac_item_child', 'rbac_rule'];
        const missingRbacTables = rbacTables.filter(t => !tables.includes(t));

        // 仅在首次运行时同步表结构（无表时创建，有表时跳过以避免外键约束问题）
        if (tables.length === 0) {
        console.log('📦 首次运行，正在创建数据表...');
        await sequelize.sync({ force: true });
        const newTables = await sequelize.getQueryInterface().showAllTables();
        console.log(`✅ 数据表已创建: ${newTables.join(', ')}`);
        } else if (missingRbacTables.length > 0) {
        // 如果缺少 RBAC 核心表，则同步创建缺失的表
        console.log(`⚠️  检测到缺少 RBAC 核心表: ${missingRbacTables.join(', ')}`);
        console.log(' 正在同步创建缺失的表...');
        await sequelize.sync({ force: false, alter: false });
        const updatedTables = await sequelize.getQueryInterface().showAllTables();
        console.log(`✅ 表同步完成，现有数据表: ${updatedTables.join(', ')}`);
        } else {
        console.log('✅ 数据表已存在，检查并补齐缺失列...');
        }

        // 补齐各 RBAC 表的缺失列（使用 ALTER TABLE ADD COLUMN，避免 SQLite 备份表重建问题）
        console.log(' 检查 RBAC 表列结构...');
        await ensureColumns('rbac_items', [
            { name: 'description', type: sequelize.Sequelize.TEXT },
            { name: 'rule_name', type: sequelize.Sequelize.STRING(64) },
            { name: 'data', type: sequelize.Sequelize.BLOB },
            { name: 'created_at', type: sequelize.Sequelize.INTEGER },
            { name: 'updated_at', type: sequelize.Sequelize.INTEGER },
        ]);
        await ensureColumns('rbac_rule', [
            { name: 'description', type: sequelize.Sequelize.STRING(255) },
            { name: 'data', type: sequelize.Sequelize.BLOB },
            { name: 'created_at', type: sequelize.Sequelize.INTEGER },
            { name: 'updated_at', type: sequelize.Sequelize.INTEGER },
        ]);
        await ensureColumns('rbac_assignment', [
            { name: 'created_at', type: sequelize.Sequelize.INTEGER },
        ]);
        await ensureColumns('rbac_item_child', [
            { name: 'parent', type: sequelize.Sequelize.STRING(64) },
            { name: 'child', type: sequelize.Sequelize.STRING(64) },
        ]);
        console.log('✅ 列结构检查完成');
        
        await runMigrations();
        await runSeeders();
    } catch (error) {
        console.error('❌ 数据表同步失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    }

    app.listen(config.server.port, config.server.host, () => {
        console.log(`🚀 服务器运行中 - http://${config.server.host}:${config.server.port}`);
        console.log(`📦 环境: ${config.env}`);
    });

    // 可选：本地 HTTPS 开发服务（HTTPS_ENABLED=true 时开启）
    if (config.server.https.enabled) {
        let key, cert;
        try {
            key = fs.readFileSync(config.server.https.keyPath);
            cert = fs.readFileSync(config.server.https.certPath);
        } catch (err) {
            console.error('❌ 读取 HTTPS 证书失败:', err.message);
            console.error('   请先运行: npm run cert');
            process.exit(1);
        }
        https.createServer({ key, cert }, app).listen(config.server.https.port, config.server.host, () => {
            console.log(`🔒 安全服务运行中 - https://${config.server.host}:${config.server.https.port}`);
        });
    }
}

bootstrap();