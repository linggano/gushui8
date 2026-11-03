const { pagination: paginationConfig } = require('../../config/app');

/**
 * 从请求 query 中提取并规范化分页参数
 * - page 默认 1，最小 1
 * - pageSize 默认取配置 defaultLimit，受 maxLimit 上限约束，最小 1
 */
function getPagination(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(
        Math.max(parseInt(query.pageSize, 10) || paginationConfig.defaultLimit, 1),
        paginationConfig.maxLimit
    );

    return {
        page,
        pageSize,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    };
}

/**
 * 根据分页结果构建统一的 pagination 视图对象
 * @param {{ count: number, rows: Array }} result - Sequelize findAndCountAll 返回值
 * @param {{ page: number, pageSize: number }} pagination - getPagination 返回值
 * @param {string} baseUrl - 分页链接的基础 URL
 */
function buildPaginationView(result, { page, pageSize }, baseUrl) {
    return {
        page,
        limit: pageSize,
        total: result.count,
        totalPages: Math.ceil(result.count / pageSize),
        baseUrl,
    };
}

module.exports = { getPagination, buildPaginationView, paginationConfig };