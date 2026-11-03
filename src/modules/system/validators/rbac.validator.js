/**
 * @file   rbac.validator.js
 * @path   src/modules/system/validators/rbac.validator.js
 * @type   javascript
 * @author linggano
 * @email  linggano@hotmail.com
 * @date   2026-11-01
 */

const { body, param, query, validationResult } = require('express-validator');

const NAME_REGEX = /^[a-zA-Z0-9_/:.@\-]{2,128}$/;
const ITEM_NAME_REGEX = /^[a-zA-Z0-9_/:.@\-]{2,64}$/;

class RbacValidator {

    static createRoleRules() {
        return [
            body('name')
                .trim()
                .notEmpty().withMessage('角色名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('角色名称只能包含字母、数字、下划线、斜杠、点、冒号、@和连字符，2-64位'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('角色描述不能超过255个字符'),
            body('rule_name')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 64 }).withMessage('规则名称不能超过64个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static updateRoleRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('角色名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('角色名称格式不正确'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('角色描述不能超过255个字符'),
            body('rule_name')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 64 }).withMessage('规则名称不能超过64个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static createPermissionRules() {
        return [
            body('name')
                .trim()
                .notEmpty().withMessage('权限名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('权限名称只能包含字母、数字、下划线、斜杠、点、冒号、@和连字符，2-64位'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('权限描述不能超过255个字符'),
            body('rule_name')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 64 }).withMessage('规则名称不能超过64个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static updatePermissionRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('权限名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('权限名称格式不正确'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('权限描述不能超过255个字符'),
            body('rule_name')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 64 }).withMessage('规则名称不能超过64个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static createRouteRules() {
        return [
            body('name')
                .trim()
                .notEmpty().withMessage('路由名称不能为空')
                .matches(NAME_REGEX).withMessage('路由名称只能包含字母、数字、下划线、斜杠、点、冒号、@和连字符，2-128位'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('路由描述不能超过255个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static updateRouteRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('路由名称不能为空')
                .matches(NAME_REGEX).withMessage('路由名称格式不正确'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('路由描述不能超过255个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static createRuleRules() {
        return [
            body('name')
                .trim()
                .notEmpty().withMessage('规则名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('规则名称只能包含字母、数字、下划线、斜杠、点、冒号、@和连字符，2-64位'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('规则描述不能超过255个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static updateRuleRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('规则名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('规则名称格式不正确'),
            body('description')
                .optional({ nullable: true })
                .trim()
                .isLength({ max: 255 }).withMessage('规则描述不能超过255个字符'),
            body('data')
                .optional()
                .custom(value => {
                    if (typeof value === 'object') return true;
                    if (typeof value === 'string') {
                        try { JSON.parse(value); return true; } catch (e) {
                            throw new Error('data 参数必须是有效的 JSON');
                        }
                    }
                    throw new Error('data 参数必须是有效的 JSON 对象');
                })
        ];
    }

    static addChildRules() {
        return [
            body('parent')
                .trim()
                .notEmpty().withMessage('父项名称不能为空')
                .matches(NAME_REGEX).withMessage('父项名称格式不正确'),
            body('child')
                .trim()
                .notEmpty().withMessage('子项名称不能为空')
                .matches(NAME_REGEX).withMessage('子项名称格式不正确')
                .custom((value, { req }) => {
                    if (req.body.parent && value === req.body.parent) {
                        throw new Error('不能将项目添加为自身的子项');
                    }
                    return true;
                })
        ];
    }

    static removeChildRules() {
        return [
            body('parent')
                .trim()
                .notEmpty().withMessage('父项名称不能为空')
                .matches(NAME_REGEX).withMessage('父项名称格式不正确'),
            body('child')
                .trim()
                .notEmpty().withMessage('子项名称不能为空')
                .matches(NAME_REGEX).withMessage('子项名称格式不正确')
        ];
    }

    static assignRoutesToPermissionRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('权限名称不能为空')
                .matches(NAME_REGEX).withMessage('权限名称格式不正确'),
            body('children')
                .optional()
                .customSanitizer(value => {
                    if (value === undefined || value === null || value === '') return undefined;
                    return Array.isArray(value) ? value : [value];
                })
                .isArray({ min: 0 }).withMessage('children 必须是数组')
        ];
    }

    static saveScannedRoutesRules() {
        return [
            body('routes')
                .optional()
                .isArray({ min: 1 }).withMessage('routes 必须是数组'),
            body('routes.*.path')
                .optional()
                .isString().withMessage('路由路径格式不正确')
                .trim()
                .notEmpty().withMessage('路由路径不能为空')
                .matches(NAME_REGEX).withMessage('路由路径格式不正确'),
            body('routes.*.methods')
                .optional()
                .isArray({ min: 1 }).withMessage('路由方法必须是数组'),
            body('routes.*.methods.*')
                .optional()
                .isString().withMessage('路由方法格式不正确')
                .trim()
                .notEmpty().withMessage('路由方法不能为空')
        ];
    }

    static assignRoleToUserRules() {
        return [
            param('id')
                .notEmpty().withMessage('用户ID不能为空')
                .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
            body('role_name')
                .trim()
                .notEmpty().withMessage('角色名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('角色名称格式不正确')
        ];
    }

    static revokeRoleFromUserRules() {
        return [
            param('id')
                .notEmpty().withMessage('用户ID不能为空')
                .isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
            body('role_name')
                .trim()
                .notEmpty().withMessage('角色名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('角色名称格式不正确')
        ];
    }

    static deleteItemRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('项目名称不能为空')
                .matches(NAME_REGEX).withMessage('项目名称格式不正确')
        ];
    }

    static deleteRuleRules() {
        return [
            param('name')
                .trim()
                .notEmpty().withMessage('规则名称不能为空')
                .matches(ITEM_NAME_REGEX).withMessage('规则名称格式不正确')
        ];
    }
}

module.exports = RbacValidator;