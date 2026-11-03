// src/modules/System/rules/amount-threshold.rule.js
class AmountThresholdRule {
  static get metadata() {
    return {
      name: 'AmountThresholdRule',
      description: '金额阈值限制：仅在配置的金额范围内允许访问',
    };
  }

  execute(rule, params) {
    const { maxAmount, minAmount } = rule.data || {};
    const { amount } = params;
    
    if (maxAmount !== undefined && amount > maxAmount) return false;
    if (minAmount !== undefined && amount < minAmount) return false;
    
    return true;
  }
}
module.exports = AmountThresholdRule;