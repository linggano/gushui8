const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes, Model) => {
    class User extends Model {
        // 验证密码
        async comparePassword(candidatePassword) {
            if (!this.password_hash) {
                throw new Error('用户密码未设置');
            }
            return await bcrypt.compare(candidatePassword, this.password_hash);
        }
        
        // 增加登录尝试次数
        async incrementLoginAttempts(transaction) {
            this.login_attempts = (this.login_attempts || 0) + 1;
            
            // 如果尝试次数达到5次，锁定账户
            if (this.login_attempts >= 5) {
                this.is_locked = true;
                this.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 锁定30分钟
            }
            
            await this.save({ transaction });
        }
        
        // 获取RBAC模型（延迟加载避免循环依赖）
        _getRbacModels() {
            const models = require('../index');
            return {
                RbacAssignment: models.RbacAssignment,
                RbacItem: models.RbacItem,
                RbacItemChild: models.RbacItemChild
            };
        }
        
        // 获取用户的所有角色
        async getRoles() {
            const { RbacAssignment, RbacItem } = this._getRbacModels();
            
            const assignments = await RbacAssignment.findAll({
                where: { user_id: this.id },
                include: [{
                    model: RbacItem,
                    as: 'rbacItem',
                    where: { type: 1 } // 角色类型
                }]
            });
            
            return assignments.map(a => a.rbacItem);
        }
        
        // 获取用户的所有权限
        async getPermissions() {
            const { RbacItem, RbacItemChild } = this._getRbacModels();
            
            const roles = await this.getRoles();
            const roleNames = roles.map(r => r.name);
            
            if (roleNames.length === 0) return [];
            
            const children = await RbacItemChild.findAll({
                where: { parent: roleNames }
            });
            
            const childNames = children.map(c => c.child);
            
            const permissions = await RbacItem.findAll({
                where: {
                    name: childNames,
                    type: 2 // 权限类型
                }
            });
            
            return permissions;
        }
        
        // 检查用户是否有某个权限
        async can(permissionName) {
            const permissions = await this.getPermissions();
            return permissions.some(p => p.name === permissionName);
        }
        
        // 检查用户是否有某个角色
        async hasRole(roleName) {
            const roles = await this.getRoles();
            return roles.some(r => r.name === roleName);
        }
        
        // 分配角色给用户
        async assignRole(roleName, expiresAt = null) {
            const { RbacAssignment, RbacItem } = this._getRbacModels();
            
            const role = await RbacItem.findByPk(roleName);
            if (!role || !role.isRole) {
                throw new Error('角色不存在');
            }
            
            await RbacAssignment.upsert({
                user_id: this.id,
                item_name: roleName,
                expires_at: expiresAt
            });
            
            return true;
        }
        
        // 移除用户的角色
        async removeRole(roleName) {
            const { RbacAssignment } = this._getRbacModels();
            
            await RbacAssignment.destroy({
                where: {
                    user_id: this.id,
                    item_name: roleName
                }
            });
            
            return true;
        }
        
        // 安全JSON转换
        toSafeJSON() {
            const user = this.toJSON();
            
            // 移除敏感信息
            delete user.password_hash;
            delete user.password_reset_token;
            delete user.password_reset_expires;
            delete user.login_attempts;
            delete user.is_locked;
            delete user.locked_until;
            delete user.auth_key;
            return user;
        }
    }
  
    User.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        
        username: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },
        
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },

        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            comment: '用户手机号'
        },

        auth_key: {
            type: DataTypes.STRING(255),
            defaultValue: null
        },
        
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        password_reset_token: {
            type: DataTypes.STRING(255),
            unique: true,
            defaultValue: null
        },
        
        password_reset_expires: {
            type: DataTypes.DATE
        },
        
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10
        },

        verificationStatus: {
            type: DataTypes.ENUM('unverified', 'pending', 'verified', 'rejected'),
            defaultValue: 'unverified'
        },
        
        is_locked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        
        locked_until: {
            type: DataTypes.DATE
        },
        
        login_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        login_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        
        last_login_at: {
            type: DataTypes.DATE,
            field: 'last_login'
        },
        
        last_login_ip: {
            type: DataTypes.STRING
        },

        home_route: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null,
            comment: '用户个人默认首页路由（优先级最高）'
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true, // 启用时间戳
        underscored: true, // 使用下划线命名
        paranoid: true, // 启用软删除
        deletedAt: 'deleted_at', // 指定字段名
        createdAt: 'created_at', // 指定字段名
        updatedAt: 'updated_at', // 指定字段名

        // 索引
        indexes: [
            { fields: ['email'] },
            { fields: ['username'] },
            { fields: ['status'] },
            { fields: ['verification_status'] }
        ],
        
        // Scopes
        scopes: {
            withSensitive: {
                attributes: { include: ['password_hash', 'login_attempts', 'is_locked', 'locked_until'] }
            }
        },
        
        // 钩子
        hooks: {
            beforeCreate: async (user) => {
                if (user.password_hash) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                }
            },
        
            beforeUpdate: async (user) => {
                if (user.changed('password_hash')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                }
            }
        }
    });
    
    return User;
};