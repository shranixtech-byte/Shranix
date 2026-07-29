"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDatabaseConfig = loadDatabaseConfig;
exports.getDatabaseConfig = getDatabaseConfig;
function loadDatabaseConfig() {
    const provider = (process.env.DATABASE_PROVIDER || 'sqlite');
    const url = process.env.DATABASE_URL || (provider === 'sqlite' ? 'file:./data/dev.db' : 'postgresql://localhost:5432/shranix_krushi_erp');
    return {
        url,
        provider,
        logLevel: process.env.DATABASE_LOG_LEVEL || 'error',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
    };
}
function getDatabaseConfig() {
    return loadDatabaseConfig();
}
//# sourceMappingURL=database.config.js.map