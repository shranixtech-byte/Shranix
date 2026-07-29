import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'SHRANIX-Krushi-ERP',
  port: parseInt(process.env.APP_PORT || '4001', 10),
  url: process.env.APP_URL || 'http://localhost:4001',
  env: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4000,tauri://localhost').split(','),
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true' || process.env.SWAGGER_ENABLED === '1',
  swaggerPath: process.env.SWAGGER_PATH || 'api/docs',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
}));
