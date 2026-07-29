# Authentication Login Root Cause Fix

**Date:** July 26, 2026  
**Author:** Buffy (AI Agent)  
**Status:** ✅ Login fully working

---

## 1. Root Cause

### Primary Root Cause: Seed Script Uses Wrong Database API

The database seed script (`database/src/seeds/run.ts`) calls `(db as any).execute()` on the database client object. However, the client returned by `getDatabaseClient()` is a **Drizzle ORM-wrapped** `LibSQLDatabase`, which **does not expose an `.execute()` method**. The correct API for the Drizzle-wrapped client uses query builders (`.select()`, `.insert()`, etc.) rather than raw SQL.

**The error:**
```
TypeError: db.execute is not a function
```

This caused the seed script to crash **before** it could check if an admin user existed or create one. When the database is fresh (no admin user), the seed fails, login fails with "Invalid credentials" because no user exists in the database.

### Secondary Cause: Typed `(db as any)` Hides the Problem

The source code uses `(db as any).execute()` which bypasses TypeScript type checking. At compile time, the error is invisible because `any` disables all type checks. At runtime, the error surfaces because the Drizzle ORM `LibSQLDatabase` simply doesn't have an `.execute()` method.

---

## 2. Files Modified

| File | Change | Reason |
|------|--------|--------|
| `database/src/client/sqlite.client.ts` | Added `getRawSqliteClient()` function | Exposes raw `@libsql/client` instance for running raw SQL |
| `database/src/client/client.factory.ts` | Added `getRawClient(config)` function with `LibsqlClient` type import | Factory pattern to get raw client through the existing abstraction |
| `database/src/seeds/run.ts` | Changed all `(db as any).execute()` → `rawClient.execute()` | Uses raw libsql client which supports the `{sql, args}` format |
| `database/src/seeds/run.ts` | Changed import: removed `getDatabaseClient`, added `getRawClient` | Updated imports to match the new factory function |
| `database/src/seeds/run.ts` | Fixed missing `runSeeds();` call at end of file | Was accidentally removed during edits |

---

## 3. Admin Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@shranix.com` |
| **Password** | `admin123` |
| **Role** | `admin` (System Administrator) |
| **First Name** | Admin |
| **Last Name** | User |

These credentials are defined in `database/src/seeds/run.ts` (lines 66-70) and are created by running:
```bash
pnpm run --filter @shranix/database db:seed
```

---

## 4. Login API Verification

| Check | Result | Details |
|-------|--------|---------|
| Backend starts | ✅ | NestJS application starts on `http://localhost:3001/api` |
| POST `/api/v1/auth/login` | ✅ | HTTP **200 OK** |
| Access Token | ✅ | Valid JWT generated (HS256 algorithm) |
| Refresh Token | ✅ | Separate refresh token with 7-day expiry |
| User Object | ✅ | Returns `{id, email, firstName, lastName, isActive, ...}` |
| JWT Payload | ✅ | Contains `{sub, email, role: "admin", permissions: [...], tokenVersion}` |
| Rate Limiting | ✅ | 10 requests/minute per IP on login endpoint |
| Error on Wrong Password | ✅ | Returns HTTP 401 "Invalid credentials" |
| Error on Unknown Email | ✅ | Returns HTTP 401 "Invalid credentials" |

### Sample Login Response
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "user": {
      "id": "<uuid>",
      "email": "admin@shranix.com",
      "firstName": "Admin",
      "lastName": "User",
      "isActive": true,
      "isEmailVerified": true,
      "failedLoginAttempts": 0,
      "refreshTokenVersion": 0
    },
    "tokens": {
      "accessToken": "<jwt>",
      "refreshToken": "<jwt>",
      "expiresIn": 86400
    }
  }
}
```

### Cookie Response Headers
- `Set-Cookie: refresh_token=<token>; HttpOnly; SameSite=Lax; Max-Age=604`
- `Set-Cookie: csrf_token=<token>; SameSite=Lax`

---

## 5. How the Login Flow Works

1. **Frontend** sends `POST /api/v1/auth/login` with JSON body `{email, password}`
2. **AuthController.login()** receives the request, extracts IP and User-Agent
3. **AuthService.login()**:
   - Looks up user by email via `DatabaseService.users.findByEmail()`
   - Checks account lock status
   - Verifies password hash using `argon2.verify()`
   - Resets failed login attempts on success
   - Generates JWT access token + refresh token
   - Stores refresh token hash in database
   - Logs audit event (login success/failure)
4. **AuthController** sets HTTP-only `refresh_token` cookie + `csrf_token` cookie
5. **Response** returns user object + tokens

### API Details
- **Endpoint:** `POST http://localhost:3001/api/v1/auth/login`
- **Global Prefix:** `api` (from `API_PREFIX` constant)
- **Versioning:** `v1` (from `VersioningType.URI`, `defaultVersion: '1'`)
- **Full path:** `/api/v1/auth/login`

---

## 6. Seed Script Verification

| Check | Result | Details |
|-------|--------|---------|
| Seed script builds | ✅ | TypeScript compiles without errors |
| Seed script runs | ✅ | Detects existing admin and skips, or creates admin on fresh DB |
| Admin creation | ✅ | Creates user, role, permissions in one transaction |
| Admin login | ✅ | Login returns HTTP 200 with valid JWT |

To run the seed on a fresh database:
```bash
pnpm run --filter @shranix/database db:seed
```

---

## 7. Final Result

```
✅ Login fully working
```

### Summary of Fix

The root cause was a **mismatch between the seed script's API usage and the actual database client API**. The seed script used `(db as any).execute()` which assumed the database client had an `.execute()` method. However, the database client was wrapped by Drizzle ORM (`drizzle-orm/libsql`), which provides a query-builder API, not a raw SQL `.execute()` method.

The fix exposes the underlying raw `@libsql/client` instance (which supports `.execute()`) through a new `getRawClient()` factory function, and updates the seed to use it.

The login API itself was **always working** — the issue was only the seed script that creates the administrator account. Once an admin user exists in the database (either from a previously successful seed run or from this fixed seed), the login flow works correctly.

### Remaining Notes
- The admin password can be overridden in production via the `ADMIN_PASSWORD` environment variable
- The frontend login form posts to `http://localhost:3001/api/v1/auth/login` and stores JWT in localStorage
- Account lockout occurs after 5 failed attempts (15-minute lock duration)
