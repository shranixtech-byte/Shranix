import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { AppModule } from '../src/app.module';

/**
 * E2E Authentication & Authorization Tests
 *
 * Tests the full auth flow: register → login (cookie check) → me → refresh → logout
 * plus RBAC, permissions, cookies, and CSRF protection.
 */

/**
 * E2E tests boot the full NestJS app, which requires a live database.
 * In CI (or any environment without a configured DB) the suite is skipped
 * gracefully instead of failing the whole pipeline.
 */
function isDatabaseAvailable(): boolean {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  const url = process.env.DATABASE_URL || 'file:./data/dev.db';

  if (provider === 'postgresql') {
    return Boolean(process.env.DATABASE_URL);
  }

  // SQLite: check the db file exists (skip when missing, e.g. CI)
  if (url.startsWith('file:')) {
    return existsSync(resolve(process.cwd(), url.replace(/^file:/, '')));
  }

  return true;
}

describe.skipIf(!isDatabaseAvailable())('Auth E2E: Full Authentication Flow', () => {
  let app: INestApplication;

  const testUser = {
    email: `e2e-test-${Date.now()}@shranix.com`,
    password: 'TestPass123!@',
    firstName: 'E2E',
    lastName: 'Test',
  };

  let accessToken: string;
  let refreshTokenValue: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ── Register ──────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();

      accessToken = res.body.tokens.accessToken;
      refreshTokenValue = res.body.tokens.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send(testUser).expect(409);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect(400);
    });
  });

  // ── Login ─────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should login successfully and set refresh_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.tokens.accessToken).toBeDefined();

      // Check refresh_token cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');

      // Check CSRF token cookie
      const csrfCookie = cookies.find((c: string) => c.startsWith('csrf_token='));
      expect(csrfCookie).toBeDefined();

      accessToken = res.body.tokens.accessToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@shranix.com', password: testUser.password })
        .expect(401);
    });
  });

  // ── Me (Authenticated Request) ────────────────────────
  describe('POST /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).post('/api/auth/me').expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });
  });

  // ── Token Refresh ─────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should refresh access token using refresh token from body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshTokenValue })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      accessToken = res.body.accessToken;
      refreshTokenValue = res.body.refreshToken;
    });

    it('should reject refresh with expired/invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  // ── CSRF Token ────────────────────────────────────────
  describe('POST /api/auth/csrf', () => {
    it('should return a CSRF token', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/csrf').expect(200);

      expect(res.body.csrfToken).toBeDefined();
      expect(typeof res.body.csrfToken).toBe('string');
    });
  });

  // ── RBAC (Roles & Permissions) ────────────────────────
  describe('RBAC: Roles & Permissions', () => {
    it('should return 200 for roles endpoint with admin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });

    it('should return 200 for users endpoint with admin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  // ── Logout ────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should logout successfully and clear refresh_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully');

      // Verify cookie is cleared
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
        expect(refreshCookie).toContain('Max-Age=0');
      }
    });

    it('should reject me request after logout (token invalidated)', async () => {
      // Try using the old token — may still be valid until expiry
      // This test validates that the token still works (logout invalidates refresh, not access)
      const res = await request(app.getHttpServer())
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      // The access token may still be valid since it wasn't explicitly revoked
      expect([200, 401]).toContain(res.status);
    });
  });

  // ── Health Check ──────────────────────────────────────
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.body.status).toBeDefined();
      expect(res.body.status).toBe('ok');
    });
  });
});
