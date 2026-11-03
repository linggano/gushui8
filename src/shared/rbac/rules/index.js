// src/shared/rbac/rules/index.js

const path = require('path');

const rules = {};

[
    'own-data.rule',
    'dept-scope.rule',
    'order-update.rule',
    'time-window.rule',
    'amount-threshold.rule',
    'status-check.rule',
].forEach(file => {
    const rulePath = path.join(__dirname, file);
    try {
        const RuleClass = require(rulePath);
        if (RuleClass && RuleClass.metadata) {
            rules[RuleClass.metadata.name] = RuleClass;
        }
    } catch (e) {
        console.warn(`[RBAC] Rule file load failed: ${file}`, e.message);
    }
});

const ruleCache = new Map();

/**
 * 根据 rule_name 动态解析并加载规则类
 *
 * @param {string} ruleName - 规则名称（PascalCase），如 "DeptScopeRule"
 * @returns {object|null} 规则类，含 metadata 和 execute 方法
 *
 * 命名约定：
 *   PascalCase → kebab-case
 *   例：DeptScopeRule → dept-scope.rule.js
 */
function resolveRule(ruleName) {
    if (!ruleName || typeof ruleName !== 'string') return null;

    // 缓存命中
    if (ruleCache.has(ruleName)) return ruleCache.get(ruleName);

    // 预注册的规则
    if (rules[ruleName]) {
        ruleCache.set(ruleName, rules[ruleName]);
        return rules[ruleName];
    }

    // 动态加载：PascalCase → kebab-case-fileName.rule.js
    const fileName = ruleName
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
        + '.rule.js';

    try {
        const rulePath = path.join(__dirname, fileName);
        const RuleClass = require(rulePath);
        if (RuleClass && RuleClass.metadata) {
            ruleCache.set(ruleName, RuleClass);
            return RuleClass;
        }
    } catch (e) {
        console.warn(`[RBAC] Cannot resolve rule "${ruleName}" → "${fileName}":`, e.message);
    }

    ruleCache.set(ruleName, null);
    return null;
}

/**
 * 获取所有已加载规则的元数据列表
 */
function getAvailableRules() {
    return Object.values(rules)
        .map(RuleClass => RuleClass.metadata);
}

module.exports = {
    OwnDataRule: rules['OwnDataRule'],
    DeptScopeRule: rules['DeptScopeRule'],
    OrderUpdateRule: rules['OrderUpdateRule'],
    TimeWindowRule: rules['TimeWindowRule'],
    AmountThresholdRule: rules['AmountThresholdRule'],
    StatusCheckRule: rules['StatusCheckRule'],
    resolveRule,
    getAvailableRules,
};