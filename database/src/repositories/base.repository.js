"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const query_helper_1 = require("../utils/query.helper");
class BaseRepository {
    table;
    db;
    softDeleteEnabled;
    constructor(table, db) {
        this.table = table;
        this.db = db;
        this.softDeleteEnabled = 'deletedAt' in table;
    }
    async findById(id) {
        const rows = await this.db.select().from(this.table);
        const filtered = rows.filter((r) => r.id === id);
        return filtered[0] || null;
    }
    async findAll(params = { page: 1, pageSize: 20 }) {
        const { page, pageSize } = params;
        const allRows = await this.db.select().from(this.table);
        const total = allRows.length;
        const start = (page - 1) * pageSize;
        const data = allRows.slice(start, start + pageSize);
        return (0, query_helper_1.paginateResult)(data, total, params);
    }
    async create(data) {
        await this.db.insert(this.table).values(data);
        return data;
    }
    async update(id, data) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const updateData = { ...data, updatedAt: new Date().toISOString() };
        const op = this.db.update(this.table);
        await op.set(updateData).where((0, drizzle_orm_1.eq)(this.table, id));
        return { ...existing, ...updateData };
    }
    async softDelete(id) {
        if (!this.softDeleteEnabled)
            return this.delete(id);
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const op = this.db.update(this.table);
        await op
            .set({ deletedAt: new Date().toISOString(), isDeleted: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table, id), (0, drizzle_orm_1.isNull)(this.table)));
        return { ...existing, deletedAt: new Date().toISOString(), isDeleted: true };
    }
    async delete(id) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        const op = this.db.delete(this.table);
        await op.where((0, drizzle_orm_1.eq)(this.table, id));
        return existing;
    }
    async countAll() {
        const rows = await this.db.select().from(this.table);
        return rows.length;
    }
    async exists(id) {
        const result = await this.findById(id);
        return result !== null;
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map