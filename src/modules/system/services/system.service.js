const os = require('os');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../../../shared/database');

const DB_FILE = process.env.DATABASE_STORAGE || path.join(process.cwd(), 'database.sqlite');
const SESSIONS_DB = process.env.SESSION_DB || path.resolve('database', 'sessions.sqlite');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

class SystemService {
    async getStats() {
        const stats = {};

        // 数据库统计
        const tables = await sequelize.getQueryInterface().showAllTables();
        const tableCounts = {};
        for (const table of tables) {
            try {
                const [result] = await sequelize.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
                tableCounts[table] = result[0]?.cnt || 0;
            } catch (_) {
                tableCounts[table] = 'N/A';
            }
        }
        stats.tables = tableCounts;
        stats.tableCount = tables.length;

        // 数据库文件大小
        try {
            const mainStat = fs.statSync(DB_FILE);
            stats.dbSize = mainStat.size;
            stats.dbSizeFormatted = formatBytes(mainStat.size);
            stats.dbModified = mainStat.mtime;
        } catch (_) {
            stats.dbSize = 0;
            stats.dbSizeFormatted = 'N/A';
        }

        try {
            const sessStat = fs.statSync(SESSIONS_DB);
            stats.sessionDbSize = sessStat.size;
            stats.sessionDbSizeFormatted = formatBytes(sessStat.size);
        } catch (_) {
            stats.sessionDbSize = 0;
            stats.sessionDbSizeFormatted = 'N/A';
        }

        // 系统资源
        stats.uptime = os.uptime();
        stats.freemem = os.freemem();
        stats.totalmem = os.totalmem();
        stats.memUsage = ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1);
        stats.cpus = os.cpus().length;
        stats.loadavg = os.loadavg().map(l => l.toFixed(2));
        stats.platform = os.platform();
        stats.nodeVersion = process.version;

        // 备份文件列表
        stats.backups = this.listBackups();

        return stats;
    }

    listBackups() {
        if (!fs.existsSync(BACKUP_DIR)) {
            return [];
        }
        try {
            return fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.sqlite'))
                .map(f => {
                    const fullPath = path.join(BACKUP_DIR, f);
                    const stat = fs.statSync(fullPath);
                    return {
                        name: f,
                        size: stat.size,
                        sizeFormatted: formatBytes(stat.size),
                        mtime: stat.mtime,
                    };
                })
                .sort((a, b) => b.mtime - a.mtime);
        } catch (_) {
            return [];
        }
    }

    async createBackup() {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${timestamp}.sqlite`;
        const backupPath = path.join(BACKUP_DIR, backupName);

        // 备份前先同步数据库
        try {
            await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)');
        } catch (_) {}

        fs.copyFileSync(DB_FILE, backupPath);

        return {
            name: backupName,
            path: backupPath,
            size: fs.statSync(backupPath).size,
        };
    }

    async restoreBackup(filename) {
        const backupPath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(backupPath)) {
            throw new Error(`备份文件不存在: ${filename}`);
        }

        // 先备份当前数据库（以防恢复失败）
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safetyBackup = path.join(BACKUP_DIR, `pre_restore_${timestamp}.sqlite`);
        fs.copyFileSync(DB_FILE, safetyBackup);

        // 恢复
        fs.copyFileSync(backupPath, DB_FILE);

        return { restored: filename, safety: path.basename(safetyBackup) };
    }

    async deleteBackup(filename) {
        const backupPath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(backupPath)) {
            throw new Error(`备份文件不存在: ${filename}`);
        }
        fs.unlinkSync(backupPath);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = new SystemService();