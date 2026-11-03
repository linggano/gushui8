// src/modules/System/rules/status-check.rule.js
class StatusCheckRule {
  static get metadata() {
    return {
      name: 'StatusCheckRule',
      description: '状态检查限制：仅在资源状态匹配配置的允许状态列表时允许访问',
    };
  }

  execute(rule, params) {
    const { allowedStatuses } = rule.data || {};
    const { status } = params;
    
    if (!allowedStatuses || allowedStatuses.length === 0) return true;
    return allowedStatuses.includes(status);
  }
}
module.exports = StatusCheckRule;