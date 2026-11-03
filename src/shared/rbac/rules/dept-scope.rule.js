// src/modules/System/rules/dept-scope.rule.js

/**
 * DeptScopeRule - 部门数据范围规则
 * 
 * 判断逻辑：
 * 1. 超级管理员 / 系统管理员 → 直接通过（看全部）
 * 2. 资源所属部门 === 用户所属部门 → 通过
 * 3. includeSubDept = true 且 资源部门是用户部门的子部门 → 通过
 * 4. 其他情况 → 拒绝
 * 
 * 使用方式：
 *   - 给权限项绑定 rule_name = 'DeptScopeRule'
 *   - 在 Controller 里传 params.resourceDepartmentId
 * 
 * 配置参数（存在 RbacRule.data）：
 *   {
 *     "includeSubDept": true,      // 是否包含子部门
 *     "bypassRoles": ["super_admin", "system_admin"]  // 跳过的角色
 *   }
 */
class DeptScopeRule {
  static get metadata() {
    return {
      name: 'DeptScopeRule',
      description: '仅允许访问用户所在部门及子部门的数据',
    };
  }

  async execute(rule, params) {
    const { userId, resourceDepartmentId, includeSubDept = true } = params;
    
    // 1. 获取用户所在部门
    const user = await User.findByPk(userId, {
      attributes: ['departmentId']
    });
    if (!user || !user.departmentId) return false;
    
    // 2. 如果用户部门就是资源部门，直接通过
    if (user.departmentId === resourceDepartmentId) return true;
    
    // 3. 如果需要包含子部门，检查资源部门是否是用户部门的子部门
    if (includeSubDept) {
      const userDept = await Department.findByPk(user.departmentId);
      const resourceDept = await Department.findByPk(resourceDepartmentId);
      
      if (userDept && resourceDept) {
        // 利用物化路径判断
        return resourceDept.path.startsWith(userDept.path);
      }
    }
    
    return false;
  }
}
module.exports = DeptScopeRule;