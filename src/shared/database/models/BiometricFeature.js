module.exports = (sequelize, DataTypes, Model) => {
    const BIOMETRIC_TYPE = {
        FACE: 'face',
        VOICEPRINT: 'voiceprint',
        FINGERPRINT: 'fingerprint'
    };

    const BIOMETRIC_TYPE_TEXT = {
        face: '脸部特征',
        voiceprint: '声纹特征',
        fingerprint: '指纹特征'
    };

    class BiometricFeature extends Model {
        getBiometricTypeText() {
            return BIOMETRIC_TYPE_TEXT[this.biometric_type] || '未知';
        }

        isFingerprint() {
            return this.biometric_type === BIOMETRIC_TYPE.FINGERPRINT;
        }

        isFace() {
            return this.biometric_type === BIOMETRIC_TYPE.FACE;
        }

        isVoiceprint() {
            return this.biometric_type === BIOMETRIC_TYPE.VOICEPRINT;
        }

        toSafeJSON() {
            const feature = this.toJSON();
            return feature;
        }
    }

    BiometricFeature.BIOMETRIC_TYPE = BIOMETRIC_TYPE;
    BiometricFeature.BIOMETRIC_TYPE_TEXT = BIOMETRIC_TYPE_TEXT;

    BiometricFeature.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '关联员工ID'
        },

        biometric_type: {
            type: DataTypes.ENUM('face', 'voiceprint', 'fingerprint'),
            allowNull: false,
            comment: '生物特征类型：face=脸部特征，voiceprint=声纹特征，fingerprint=指纹特征'
        },

        feature_data: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: '生物特征数据（加密存储）'
        },

        feature_version: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '特征数据版本号'
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: '是否启用'
        },

        enrolled_at: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: '录入时间'
        },

        last_verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最后验证时间'
        },

        remark: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '备注'
        },

        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '软删除时间'
        }
    }, {
        sequelize,
        modelName: 'BiometricFeature',
        tableName: 'biometric_features',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        paranoid: true,

        indexes: [
            {
                fields: ['employee_id', 'biometric_type']
            }
        ]
    });

    return BiometricFeature;
};