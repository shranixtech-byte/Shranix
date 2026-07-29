export interface AppConfig {
  name: string;
  port: number;
  url: string;
  env: string;
  corsOrigins: string[];
  swaggerEnabled: boolean;
  swaggerPath: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
}

export interface LoggerConfig {
  level: string;
  format: 'pretty' | 'json';
}
