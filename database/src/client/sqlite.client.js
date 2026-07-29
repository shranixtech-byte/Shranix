"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSqliteClient = createSqliteClient;
exports.getSqliteClient = getSqliteClient;
exports.closeSqliteClient = closeSqliteClient;
const client_1 = require("@libsql/client");
let client = null;
function createSqliteClient(config) {
    if (client)
        return client;
    const libsqlConfig = {
        url: config.url,
    };
    client = (0, client_1.createClient)(libsqlConfig);
    return client;
}
function getSqliteClient() {
    if (!client) {
        throw new Error('SQLite client not initialized. Call createSqliteClient() first.');
    }
    return client;
}
async function closeSqliteClient() {
    if (client) {
        client.close();
        client = null;
    }
}
//# sourceMappingURL=sqlite.client.js.map