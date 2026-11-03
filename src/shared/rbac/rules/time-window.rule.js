// src/modules/System/rules/time-window.rule.js
class TimeWindowRule {
  static get metadata() {
    return {
      name: 'TimeWindowRule',
      description: '时间窗口限制：仅在配置的起止时间内允许访问',
    };
  }

  execute(rule, params) {
    const { start, end } = rule.data || {};
    const now = new Date();
    
    if (start && now < new Date(start)) return false;
    if (end && now > new Date(end)) return false;
    
    return true;
  }
}
module.exports = TimeWindowRule;