/**
 * @file   index.controller.js
 * @path   src/modules/users/controllers/index.controller.js
 * @type   javascript
 * @brief  普通用户模块控制器
 * @desc   处理普通用户模块的相关请求，包括用户信息展示和偏好设置处理。
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const userService = require('./../services/user.service');
const isApiRequest = require('../../../shared/utils/isApiRequest');

class IndexController {
    // ============================================================
    // 1. 用户信息
    // ============================================================
    renderUserIndex = async (req, res) => {
        const my = await userService.findById(req.session.userId);
        res.render('users/index/my', {
                title: '我的信息',
                breadcrumb: [
                    { label: '首页', href: '/home' },
                    { label: '我的信息', href: '/user' },
                ],
            user: my,
            userRoles: res.locals.userRoles || [],
            userPermissions: res.locals.userPermissions || [],
        });
    }

    // ============================================================
    // 2. 偏好设置处理
    // ============================================================
    handlePreferenceSettings = async (req, res) => {
        try {
            const targetUserId = req.params.userId || req.session.userId;
            const currentUserId = req.session.userId;
            const { home_route } = req.body;

            console.log('[偏好设置] targetUserId:', targetUserId, 'currentUserId:', currentUserId, 'home_route:', home_route);

            // 只能修改自己的偏好设置（管理员除外）
            const isAdmin = res.locals.userRoles?.some(r =>
                r === 'super_admin' || r === 'system_admin' || r === 'admin'
            );
            if (targetUserId !== currentUserId && !isAdmin) {
                if (isApiRequest(req)) {
                    return res.status(403).json({ success: false, message: '只能修改自己的偏好设置' });
                }
                req.flash('error', ['只能修改自己的偏好设置']);
                return res.redirect(req.get('Referer') || '/home');
            }

            const result = await userService.updateHomeRoute(targetUserId, home_route);
            console.log('[偏好设置] update result:', result);

            if (isApiRequest(req)) {
                return res.json({ success: true, message: '偏好设置已保存', home_route: home_route || null });
            }

            req.flash('success', '偏好设置已保存');
            res.redirect(req.get('Referer') || '/home');
        } catch (error) {
            console.error('偏好设置保存失败:', error);
            if (isApiRequest(req)) {
                return res.status(500).json({ success: false, message: '保存失败，请重试' });
            }
            req.flash('error', ['保存失败，请重试']);
            res.redirect(req.get('Referer') || '/home');
        }
    }
}

module.exports = new IndexController();