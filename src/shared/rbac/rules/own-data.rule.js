class OwnDataRule {
  static get metadata() {
    return {
      name: 'OwnDataRule',
      description: '仅允许访问用户自己的数据',
    };
  }

  /**
   * @param {Object} rule - rule 记录
   * @param {Object} params - { userId, resourceOwnerId, ... }
   */
  execute(rule, params) {
    return String(params.userId) === String(params.resourceOwnerId);
  }
}

module.exports = OwnDataRule;