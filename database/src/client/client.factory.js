"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseClient = createDatabaseClient;
exports.getDatabaseClient = getDatabaseClient;
exports.closeDatabaseClient = closeDatabaseClient;
const sqlite_client_1 = require("./sqlite.client");
const postgres_client_1 = require("./postgres.client");
function createDatabaseClient(config) {
    if (config.provider === 'postgresql') {
        return (0, postgres_client_1.createPostgresClient)(config);
    }
    return (0, sqlite_client_1.createSqliteClient)(config);
}
function getDatabaseClient(config) {
    if (config.provider === 'postgresql') {
        return (0, postgres_client_1.getPostgresClient)();
    }
    return (0, sqlite_client_1.getSqliteClient)();
}
async function closeDatabaseClient(config) {
    if (config.provider === 'postgresql') {
        await (0, postgres_client_1.closePostgresClient)();
    }
    else {
        await (0, sqlite_client_1.closeSqliteClient)();
    }
}
//# sourceMappingURL=client.factory.js.map