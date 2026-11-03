const { Op } = require('sequelize');
const { NotFoundError } = require('../utils/errors');
const { paginationConfig } = require('../utils/pagination');

class BaseRepository {
    /**
     * @param {import('sequelize').Model} model - Sequelize 模型类
     * @description 构造函数：绑定当前 Repository 对应的 Sequelize Model，
     * 并自动探测默认排序字段（优先 created_at，回退 createdAt），
     * 子类通过 super(YourModel) 调用即可完成初始化。
     */
    constructor(model) {
        // 防御：未传入 Model 直接抛错，避免运行时出现难以排查的 this.model.findByPk is not a function
        if (!model) {
            throw new Error('BaseRepository 需要传入 Sequelize Model');
        }
        // 保存模型引用，子类通过 this.model 访问 Sequelize 原生方法
        this.model = model;
        // 缓存模型名称，用于错误提示（如 "Lead 不存在"）
        this.modelName = model.name;
        // 自动检测时间戳字段，供 findAll/findAndCountAll 默认排序使用
        this.defaultOrderField = this._detectTimestampField();
    }

    /**
     * 探测模型的创建时间字段，用于 findAll 默认排序
     * Sequelize 支持 underscored: true 时生成 created_at，否则生成 createdAt
     * @returns {string|null} 时间戳字段名，未找到则返回 null
     * @private
     */
    _detectTimestampField() {
        // rawAttributes 包含模型所有字段的原始定义（含主键、时间戳、自定义字段）
        const rawAttrs = this.model.rawAttributes;
        // underscored: true 的模型使用蛇形命名 created_at（项目主流配置）
        if (rawAttrs.created_at) return 'created_at';
        // 回退：标准驼峰命名 createdAt
        if (rawAttrs.createdAt) return 'createdAt';
        // 模型未启用 timestamps 时两个字段都不存在，返回 null 由 _buildOrder 跳过默认排序
        return null;
    }

    /**
     * 构建 Sequelize order 选项
     * 优先使用调用方传入的 order，否则回退到构造时探测到的默认时间戳字段（DESC）
     * 若模型未开启 timestamps 则返回 undefined，Sequelize 将使用默认顺序
     * @param {Array|undefined} order - 外部传入的排序条件
     * @returns {Array|undefined} Sequelize order 格式
     * @private
     */
    _buildOrder(order) {
        // 调用方显式指定了排序，直接透传
        if (order) return order;
        // 有默认时间戳字段时，按创建时间倒序（最新在前）
        if (this.defaultOrderField) {
            return [[this.defaultOrderField, 'DESC']];
        }
        // 无时间戳字段也无外部排序，让 Sequelize 使用其默认顺序（主键 ASC）
        return undefined;
    }

    /**
     * 将分页参数规范化为 Sequelize 可用的 { page, limit, offset } 结构
     * 防御性处理：非数字、负数、零值统一兜底为安全正整数
     * @param {{ page?: number, limit?: number }} params - 分页参数
     * @returns {{ page: number, limit: number, offset: number }}
     * @private
     */
    _buildPagination({ page = 1, limit } = {}) {
        // parseInt 解析失败返回 NaN → `|| 1` 兜底；Math.max 确保不会出现页码 0 或负数
        const p = Math.max(parseInt(page, 10) || 1, 1);
        // limit 默认取配置 defaultLimit，受 maxLimit 上限约束
        const l = Math.min(
            Math.max(parseInt(limit, 10) || paginationConfig.defaultLimit, 1),
            paginationConfig.maxLimit
        );
        // MySQL/SQLite 的 offset = (page - 1) * limit，避免 page=1 时偏移量为负
        return { page: p, limit: l, offset: (p - 1) * l };
    }

    /**
     * 将 Sequelize findAndCountAll 的原生返回值封装为统一分页响应结构
     * 与项目已有 repository 的分页格式对齐：{ data, total, page, limit, totalPages }
     * @param {{ count: number, rows: Model[] }} result - Sequelize 原生返回
     * @param {{ page: number, limit: number }} pagination - 已规范化的分页参数
     * @returns {{ data: Model[], total: number, page: number, limit: number, totalPages: number }}
     * @private
     */
    _paginateResult({ count, rows }, { page, limit }) {
        return {
            // 当前页记录列表（Sequelize rows 可能是 Model 实例数组或 POJO，取决于 raw 选项）
            data: rows,
            // 符合 where 条件的总记录数，用于前端计算总页数和渲染分页器
            total: count,
            // 回传规范化后的页码和每页条数，方便调用方直接使用
            page,
            limit,
            // 向上取整：7 条 / 20 条 = 1 页，21 条 / 20 条 = 2 页
            totalPages: Math.ceil(count / limit)
        };
    }

    /**
     * 查询多条记录，支持智能分页
     * - 未传 page/limit/offset → 透传为 Sequelize findAll，返回 Model[]
     * - 传了分页参数 → 自动调用 findAndCountAll 并封装为统一分页结构
     *   （此时即使调用方只要数据列表，也会额外执行 COUNT 查询以获取 total）
     * @param {{
     *   where?: Object,
     *   order?: Array,
     *   page?: number,
     *   limit?: number,
     *   offset?: number,
     *   [key: string]: any
     * }} params
     * @returns {Promise<Model[] | { data: Model[], total: number, page: number, limit: number, totalPages: number }>}
     */
    async findAll({ where = {}, order, page, limit, offset, ...options } = {}) {
        // 只要显式传了任意一个分页参数，就开启分页模式
        const hasPagination = page !== undefined || limit !== undefined || offset !== undefined;
        const finalOptions = {
            where,
            // 复用 _buildOrder 的默认排序逻辑
            order: this._buildOrder(order),
            // allowEagerLimit / transaction / benchmark 等透传给 Sequelize
            ...options
        };

        if (hasPagination) {
            // 页码式分页：规范化 page/limit，计算默认 offset
            const pagination = this._buildPagination({ page, limit });
            finalOptions.limit = pagination.limit;
            // 偏移量式优先：调用方直接传 offset 时跳过 page→offset 计算
            // 这允许两种模式共存：页码式 findAll({ page: 2 }) 和偏移量式 findAll({ offset: 40 })
            finalOptions.offset = offset !== undefined ? offset : pagination.offset;
            // findAndCountAll 在一条事务内执行 SELECT + COUNT，比两次单独查询更高效
            const result = await this.model.findAndCountAll(finalOptions);
            return this._paginateResult(result, pagination);
        }

        // 无分页 → 单纯查所有匹配记录，不额外 COUNT
        return await this.model.findAll(finalOptions);
    }

    async findAndCountAll({ where = {}, order, page = 1, limit, ...options } = {}) {
        const pagination = this._buildPagination({ page, limit });
        const result = await this.model.findAndCountAll({
            where,
            order: this._buildOrder(order),
            limit: pagination.limit,
            offset: pagination.offset,
            ...options
        });
        return this._paginateResult(result, pagination);
    }

    async findByPk(id, options = {}) {
        if (id === null || id === undefined) return null;
        return await this.model.findByPk(id, options);
    }

    async findById(id, options = {}) {
        return await this.findByPk(id, options);
    }

    async findOne({ where = {}, ...options } = {}) {
        return await this.model.findOne({ where, ...options });
    }

    async findOrCreate({ where = {}, defaults = {}, ...options } = {}) {
        return await this.model.findOrCreate({ where, defaults, ...options });
    }

    async findOneOrFail(id, options = {}) {
        const record = await this.findByPk(id, options);
        if (!record) {
            throw new NotFoundError(`${this.modelName} 不存在`);
        }
        return record;
    }

    async create(data, options = {}) {
        return await this.model.create(data, options);
    }

    async bulkCreate(records, options = {}) {
        return await this.model.bulkCreate(records, options);
    }

    async update(id, data, options = {}) {
        const record = await this.findOneOrFail(id);
        return await record.update(data, options);
    }

    async updateWhere(data, where, options = {}) {
        return await this.model.update(data, { where, ...options });
    }

    async destroy(id, options = {}) {
        const record = await this.findOneOrFail(id);
        return await record.destroy(options);
    }

    async destroyWhere(where, options = {}) {
        return await this.model.destroy({ where, ...options });
    }

    async remove(id, options = {}) {
        return await this.destroy(id, options);
    }

    async count({ where = {}, ...options } = {}) {
        return await this.model.count({ where, ...options });
    }

    async sum(field, { where = {}, ...options } = {}) {
        const result = await this.model.sum(field, { where, ...options });
        return result || 0;
    }

    async max(field, { where = {}, ...options } = {}) {
        return await this.model.max(field, { where, ...options });
    }

    async min(field, { where = {}, ...options } = {}) {
        return await this.model.min(field, { where, ...options });
    }

    async increment(id, field, { by = 1, ...options } = {}) {
        const record = await this.findOneOrFail(id);
        return await record.increment(field, { by, ...options });
    }

    async decrement(id, field, { by = 1, ...options } = {}) {
        const record = await this.findOneOrFail(id);
        return await record.decrement(field, { by, ...options });
    }

    async bulkIncrement(where, field, { by = 1, ...options } = {}) {
        return await this.model.increment(field, { where, by, ...options });
    }

    async bulkDecrement(where, field, { by = 1, ...options } = {}) {
        return await this.model.decrement(field, { where, by, ...options });
    }

    async upsert(data, options = {}) {
        const [record, created] = await this.model.upsert(data, options);
        return { record, created };
    }

    async transaction(callback) {
        const { sequelize } = this.model;
        return await sequelize.transaction(callback);
    }

    static get Op() {
        return Op;
    }

    static get operators() {
        return Op;
    }
}

module.exports = BaseRepository;