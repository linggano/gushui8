/**
 * @file   user.controller.js
 * @path   src/modules/users/controllers/user.controller.js
 * @type   javascript
 * @brief  用户模块控制器
 * @desc   处理用户模块的相关请求，包括用户信息展示和偏好设置处理。
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-02
 */

const userService = require('../services/user.service');
const LoginLogService = require('../../auth/services/loginLog.service');

const { getPagination, buildPaginationView } = require('../../../shared/utils/pagination');

class UserController {

    // ============================================================
    // 1. 用户列表
    // ============================================================
    renderUserList = async (req, res) => {
        const { page, pageSize, offset } = getPagination(req.query);
        const search = req.query.search || '';

        const { rows, count } = await userService.findAndCountAll({ offset, pageSize, search: search.trim() });
        res.render('users/list', {
            title: '用户列表',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '用户列表', href: '/users' },
            ],
            users: rows,
            search,
            pagination: buildPaginationView({ rows, count }, { page, pageSize }, '/users'),
        });
    }

    renderUserLoginLogsList = async (req, res) => {
        const { page, pageSize } = getPagination(req.query);
        const result = await LoginLogService.findAllWithUser({
            page,
            limit: pageSize,
            order: [['created_at', 'DESC']],
        });

        res.render('users/loginLogs', {
            title: '用户登录日志',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '用户列表', href: '/users' },
                { label: '登录日志', href: `/users/loginLogs` },
            ],
            loginLogs: result.data,
            pagination: buildPaginationView(
                { rows: result.data, count: result.total },
                { page: result.page, pageSize: result.limit },
                `/users/loginLogs`
            ),
        });
    }

    // ============================================================
    // 2. 用户详情
    // ============================================================
    renderUserDetail = async (req, res) => {
        const userId = req.params.userId;
        const user = await userService.findById(userId);
        res.render('users/detail', {
            title: '用户详情',
            breadcrumb: [
                { label: '首页', href: '/home' },
                { label: '用户列表', href: '/users' },
                { label: '用户详情', href: `/users/detail/${userId}` },
            ],
            user,
        });
    }

    // ============================================================
    // 3. 解锁用户
    // ============================================================
    unlockUser = async (req, res) => {
        try {
            const userId = req.params.userId;
            await userService.unlockUser(userId);
            req.flash('success', ['用户已解锁']);
            res.redirect(`/users/detail/${userId}`);
        } catch (error) {
            req.flash('error', ['解锁失败: ' + error.message]);
            res.redirect(`/users/detail/${userId}`);
        }
    }

    // ============================================================
    // 4. 锁定用户
    // ============================================================
    lockUser = async (req, res) => {
        try {
            const userId = req.params.userId;
            await userService.lockUser(userId);
            req.flash('success', ['用户已锁定']);
            res.redirect(`/users/detail/${userId}`);
        } catch (error) {
            req.flash('error', ['锁定失败: ' + error.message]);
            res.redirect(`/users/detail/${userId}`);
        }
    }

    // ============================================================
    // 5. 删除用户
    // ============================================================
    deleteUser = async (req, res) => {
        try {
            const userId = req.params.userId;
            await userService.deleteUser(userId);
            req.flash('success', ['用户已删除']);
            res.redirect('/users');
        } catch (error) {
            req.flash('error', ['删除失败: ' + error.message]);
            res.redirect(`/users/detail/${userId}`);
        }
    }

    // ============================================================
    // 6. 验证状态管理
    // ============================================================
    verifyUser = async (req, res) => {
        try {
            const userId = req.params.userId;
            const { verificationStatus } = req.body;
            const validStatuses = ['unverified', 'pending', 'verified', 'rejected'];

            if (!validStatuses.includes(verificationStatus)) {
                req.flash('error', ['无效的验证状态']);
                return res.redirect(`/users/detail/${userId}`);
            }

            await userService.verifyUser(userId, verificationStatus);

            const statusLabels = { verified: '已验证', pending: '待验证', rejected: '已拒绝', unverified: '未验证' };
            req.flash('success', [`验证状态已更新为「${statusLabels[verificationStatus]}」`]);
            res.redirect(`/users/detail/${userId}`);
        } catch (error) {
            req.flash('error', ['验证状态更新失败: ' + error.message]);
            res.redirect(`/users/detail/${userId}`);
        }
    }
}

module.exports = new UserController();