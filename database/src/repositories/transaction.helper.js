"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
exports.withPgTransaction = withPgTransaction;
exports.withSqliteTransaction = withSqliteTransaction;
async function withTransaction(_db, fn) {
    return fn();
}
async function withPgTransaction(_db, fn) {
    return fn();
}
async function withSqliteTransaction(_db, fn) {
    return fn();
}
//# sourceMappingURL=transaction.helper.js.map