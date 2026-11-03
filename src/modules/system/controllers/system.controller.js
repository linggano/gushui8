const SystemService = require('../services/system.service');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(process.cwd(), 'backups');

class SystemController {
    constructor() {
        this.systemService = SystemService;
    }

    renderDashboard = async (req, res) => {
        try {
            const stats = await this.systemService.getStats();

            res.render('system/dashboard', {
                title: '系统管理',
                breadcrumb: [
                    { label: '首页', href: '/' },
                    { label: '系统管理', href: '/system/dashboard' },
                ],
                stats,
                formatUptimeHelper,
            });
        } catch (err) {
            console.error('[System Dashboard] 加载失败:', err.message);
            req.flash('warning', ['系统数据加载失败: ' + err.message]);
            res.render('system/dashboard', {
                title: '系统管理',
                breadcrumb: [
                    { label: '首页', href: '/' },
                    { label: '系统管理', href: '/system/dashboard' },
                ],
                stats: {},
                formatUptimeHelper,
                error: err.message,
            });
        }
    };

    backupDatabase = async (req, res) => {
        try {
            const result = await this.systemService.createBackup();
            req.flash('success', [`数据库备份成功: ${result.name} (${formatBytes(result.size)})`]);
            res.redirect('/system/dashboard');
        } catch (err) {
            console.error('[Backup] 备份失败:', err.message);
            req.flash('error', ['数据库备份失败: ' + err.message]);
            res.redirect('/system/dashboard');
        }
    };

    downloadBackup = (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(filePath)) {
            req.flash('error', ['备份文件不存在']);
            return res.redirect('/system/dashboard');
        }

        res.download(filePath, filename);
    };

    restoreBackup = async (req, res) => {
        const filename = req.params.filename;
        try {
            const result = await this.systemService.restoreBackup(filename);
            req.flash('success', [
                `数据库已从 ${result.restored} 恢复成功`,
                `恢复前备份: ${result.safety}`,
            ]);
            res.redirect('/system/dashboard');
        } catch (err) {
            console.error('[Restore] 恢复失败:', err.message);
            req.flash('error', ['数据库恢复失败: ' + err.message]);
            res.redirect('/system/dashboard');
        }
    };

    deleteBackup = async (req, res) => {
        const filename = req.params.filename;
        try {
            await this.systemService.deleteBackup(filename);
            req.flash('success', [`备份 ${filename} 已删除`]);
        } catch (err) {
            req.flash('error', ['删除备份失败: ' + err.message]);
        }
        res.redirect('/system/dashboard');
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptimeHelper(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天 ${h}小时 ${m}分钟`;
    if (h > 0) return `${h}小时 ${m}分钟`;
    return `${m}分钟`;
}

module.exports = new SystemController();