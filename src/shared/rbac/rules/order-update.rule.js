// src/modules/System/rules/order-update.rule.js
class OrderUpdateRule {
  static get metadata() {
    return {
      name: 'OrderUpdateRule',
      description: '订单更新限制：未发货、金额≤10000或经理、24小时内',
    };
  }

  async execute(rule, params) {
    const { userId, order } = params;
    
    // 条件1：订单未发货
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return false;
    }
    
    // 条件2：订单金额 <= 10000 或 用户是经理
    const access = await rbacService.loadUserAccess(userId);
    if (order.amount > 10000 && !access.roles.includes('sales_manager')) {
      return false;
    }
    
    // 条件3：订单创建后 24 小时内
    const hoursSinceCreation = (Date.now() - new Date(order.createdAt)) / 3600000;
    if (hoursSinceCreation > 24) {
      return false;
    }
    
    return true;
  }
}
module.exports = OrderUpdateRule;