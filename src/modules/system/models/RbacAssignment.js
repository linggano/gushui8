const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class RbacAssignment extends Model {
        toJSON() {
            const values = super.toJSON();
            return values;
        }
    }
  
    RbacAssignment.init({
        item_name: {
            type: DataTypes.STRING(64),
            primaryKey: true
        },
        
        user_id: {
            type: DataTypes.STRING(64),
            primaryKey: true
        },
        
        created_at: {
            type: DataTypes.INTEGER,
            defaultValue: () => Date.now()
        }
    }, {
        sequelize,
        modelName: 'RbacAssignment',
        tableName: 'rbac_assignment',
        timestamps: false,
        createdAt: 'created_at',
        updatedAt: false,
        
        indexes: [
            {
                fields: ['user_id']
            }
        ]
    });
    
    return RbacAssignment;
};