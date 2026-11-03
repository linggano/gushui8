const { RbacItem, RbacItemChild, RbacAssignment, User } = require('../src/shared/database');

async function seedRbac() {
    if (!RbacItem || !RbacItemChild || !RbacAssignment) {
        console.log('⚠️  RBAC 模型未加载，跳过 RBAC 初始化');
        return;
    }

    const existingRoles = await RbacItem.count();
    if (existingRoles > 0) {
        console.log('✅ RBAC 数据已存在，跳过初始化');
        return;
    }

    console.log('📦 正在初始化 RBAC 角色和权限...');

    const superAdminRole = await RbacItem.create({
        name: 'super_admin',
        type: 1,
        description: '超级管理员',
    });

    await RbacItem.create({
        name: 'system_admin',
        type: 1,
        description: '系统管理员',
    });

    await RbacItem.create({
        name: 'user',
        type: 1,
        description: '普通用户',
    });

    const adminPermission = await RbacItem.create({
        name: 'admin_access',
        type: 2,
        description: '管理后台访问权限',
    });

    await RbacItem.create({
        name: 'user_manage',
        type: 2,
        description: '用户管理权限',
    });

    await RbacItemChild.create({ parent: 'super_admin', child: 'admin_access' });
    await RbacItemChild.create({ parent: 'super_admin', child: 'user_manage' });
    await RbacItemChild.create({ parent: 'system_admin', child: 'admin_access' });
    await RbacItemChild.create({ parent: 'system_admin', child: 'user_manage' });

    const existingUsers = await User.count();
    if (existingUsers === 0) {
        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@example.com',
            phone: '13800000000',
            password_hash: 'admin123',
            status: 10,
            verification_status: 'verified',
        });

        await RbacAssignment.create({
            user_id: adminUser.id,
            item_name: 'super_admin',
        });

        console.log('✅ 已创建默认管理员账户: admin / admin123');
    }

    console.log('✅ RBAC 初始化完成');
}

module.exports = { seedRbac };