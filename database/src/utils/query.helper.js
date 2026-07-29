"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSortOrder = buildSortOrder;
exports.buildSearchCondition = buildSearchCondition;
exports.paginateResult = paginateResult;
exports.applyPagination = applyPagination;
exports.buildFilterConditions = buildFilterConditions;
const drizzle_orm_1 = require("drizzle-orm");
function buildSortOrder(table, sortBy, sortOrder) {
    if (!sortBy)
        return undefined;
    const column = Object.entries(table).find(([key]) => key === sortBy)?.[1];
    if (!column)
        return undefined;
    return sortOrder === 'desc' ? [(0, drizzle_orm_1.desc)(column)] : [(0, drizzle_orm_1.asc)(column)];
}
function buildSearchCondition(table, searchFields, search) {
    if (!search || searchFields.length === 0)
        return undefined;
    // This is a foundation — actual search implementation
    // will be database-specific (ILIKE for PostgreSQL, LIKE for SQLite)
    return undefined;
}
function paginateResult(data, total, params) {
    const { page, pageSize } = params;
    const totalPages = Math.ceil(total / pageSize);
    return {
        data,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
    };
}
function applyPagination(query, params) {
    const { page, pageSize } = params;
    query.limit(pageSize).offset((page - 1) * pageSize);
}
function buildFilterConditions(params, fieldMap) {
    const conditions = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '')
            continue;
        const dbField = fieldMap[key] || key;
        conditions[dbField] = value;
    }
    return conditions;
}
//# sourceMappingURL=query.helper.js.map