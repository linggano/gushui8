/**
 * @file   session.controller.js
 * @path   src/modules/system/controllers/session.controller.js
 * @type   javascript
 * @brief  会话模块控制器
 * @desc   处理会话模块的相关请求，包括会话信息展示和管理。
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const sessionService = require('../services/session.service');

class SessionController {
    renderSessionList = async (req, res) => {
        try {
            const sessions = await sessionService.findAll(req.sessionStore);

            res.render('system/session/list', {
                title: '在线会话管理',
                breadcrumb: [
                    { label: '首页', href: '/home' },
                    { label: '系统管理', href: '/system/dashboard' },
                    { label: '在线会话', href: '/system/sessions' },
                ],
                sessions,
            });
        } catch (err) {
            console.error('[Session] 会话列表加载失败:', err.message);
            req.flash('error', ['会话列表加载失败: ' + err.message]);
            res.render('system/session/list', {
                title: '在线会话管理',
                breadcrumb: [
                    { label: '首页', href: '/home' },
                    { label: '系统管理', href: '/system/dashboard' },
                    { label: '在线会话', href: '/system/sessions' },
                ],
                sessions: [],
            });
        }
    };

    kickSession = async (req, res) => {
        try {
            const { sid } = req.params;
            if (!sid) {
                return res.status(400).json({ success: false, message: '缺少会话ID' });
            }

            await sessionService.destroy(req.sessionStore, sid);

            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.json({ success: true, message: '已剔除该会话' });
            }
            req.flash('success', ['已成功剔除该会话']);
            res.redirect('/system/sessions');
        } catch (err) {
            console.error('[Session] 剔除会话失败:', err.message);
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ success: false, message: err.message });
            }
            req.flash('error', ['剔除会话失败: ' + err.message]);
            res.redirect('/system/sessions');
        }
    };

    batchKickSessions = async (req, res) => {
        try {
            const { sids } = req.body;
            if (!Array.isArray(sids) || sids.length === 0) {
                return res.status(400).json({ success: false, message: '请选择要剔除的会话' });
            }

            const results = [];
            for (const sid of sids) {
                try {
                    await sessionService.destroy(req.sessionStore, sid);
                    results.push({ sid, success: true });
                } catch (err) {
                    results.push({ sid, success: false, message: err.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return res.json({
                success: true,
                message: `成功剔除 ${successCount}/${sids.length} 个会话`,
                results,
            });
        } catch (err) {
            console.error('[Session] 批量剔除会话失败:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    };

    kickUserSessions = async (req, res) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                return res.status(400).json({ success: false, message: '缺少用户ID' });
            }

            const userSessions = await sessionService.getUserSessions(req.sessionStore, userId);
            let count = 0;
            for (const s of userSessions) {
                try {
                    await sessionService.destroy(req.sessionStore, s.sid);
                    count++;
                } catch { /* skip failed destroys */ }
            }

            return res.json({ success: true, message: `已剔除该用户的 ${count} 个会话` });
        } catch (err) {
            console.error('[Session] 剔除用户会话失败:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    };
}

module.exports = new SessionController();