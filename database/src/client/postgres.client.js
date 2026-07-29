"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPostgresClient = createPostgresClient;
exports.getPostgresClient = getPostgresClient;
exports.closePostgresClient = closePostgresClient;
const postgres_1 = __importDefault(require("postgres"));
let sql = null;
function createPostgresClient(config) {
    if (sql)
        return sql;
    sql = (0, postgres_1.default)(config.url, {
        max: config.maxConnections || 10,
        idle_timeout: 30,
        connect_timeout: 10,
        prepare: true,
        debug: config.logLevel === 'all',
    });
    return sql;
}
function getPostgresClient() {
    if (!sql) {
        throw new Error('PostgreSQL client not initialized. Call createPostgresClient() first.');
    }
    return sql;
}
async function closePostgresClient() {
    if (sql) {
        await sql.end({ timeout: 5 });
        sql = null;
    }
}
//# sourceMappingURL=postgres.client.js.map