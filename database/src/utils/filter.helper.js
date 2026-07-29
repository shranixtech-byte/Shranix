"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWhereClause = buildWhereClause;
exports.createFilterRule = createFilterRule;
const drizzle_orm_1 = require("drizzle-orm");
function buildWhereClause(filters) {
    if (filters.length === 0)
        return undefined;
    const conditions = filters.map((filter) => {
        switch (filter.operator) {
            case 'eq':
                return (0, drizzle_orm_1.eq)(filter.column, filter.value);
            case 'like':
                return (0, drizzle_orm_1.like)(filter.column, `%${filter.value}%`);
            case 'gte':
                return (0, drizzle_orm_1.gte)(filter.column, filter.value);
            case 'lte':
                return (0, drizzle_orm_1.lte)(filter.column, filter.value);
            default:
                return (0, drizzle_orm_1.eq)(filter.column, filter.value);
        }
    });
    return (0, drizzle_orm_1.and)(...conditions);
}
function createFilterRule(column, operator, value) {
    return { column, operator, value };
}
//# sourceMappingURL=filter.helper.js.map