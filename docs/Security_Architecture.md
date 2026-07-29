# Security Architecture

## SHRANIX Krushi ERP — Enterprise Security Framework

---

## Overview

SHRANIX Krushi ERP implements a defense-in-depth security model covering authentication, authorization, audit logging, AI security, data protection, and infrastructure security.

---

## 1. Authentication

| Feature | Implementation |
|---|---|
| **Password Hashing** | Argon2id (OWASP recommended) |
| **Access Tokens** | JWT (24h expiry, signed with HS256) |
| **Refresh Tokens** | JWT (7d rotation, stored as httpOnly cookies) |
| **Account Lockout** | 5 failed attempts → 15 min lock |
| **Rate Limiting** | 10 req/min on login endpoint |
| **Session Management** | Token versioning for logout-all-devices |
| **Password Policy** | Change invalidates all existing sessions |

### Endpoints
| Method | Path | Auth Required |
|---|---|---|
| POST | /api/auth/register | No |
| POST | /api/auth/login | No (rate limited) |
| POST | /api/auth/refresh | Cookie |
| POST | /api/auth/logout | Yes |
| GET | /api/auth/me | Yes |
| POST | /api/auth/change-password | Yes |

---

## 2. Authorization (RBAC)

| Component | Description |
|---|---|
| **Roles** | Hierarchical role definitions (admin, manager, user, etc.) |
| **Permissions** | Granular `resource.action` format (e.g., `ai.chat`, `purchase.order.create`) |
| **JwtAuthGuard** | Validates JWT on every protected endpoint |
| **RolesGuard** | Checks user has required role (DB-backed with 60s cache) |
| **PermissionsGuard** | Checks user has required permission (DB-backed with 60s cache) |
| **@Public()** | Decorator to bypass JWT auth on open endpoints |
| **@Roles()** | Decorator for role-based access |
| **@Permissions()** | Decorator for permission-based access |

### Permission Seed Data

Permissions are auto-seeded on module initialization:
- 8 `workflow.*` permissions
- 7 `ai.*` permissions
- Module-specific permissions per business module

All automatically assigned to the Administrator role.

---

## 3. Audit Logging

| Feature | Implementation |
|---|---|
| **Security Events** | 20+ event types (login, logout, password change, permission changes, account lock) |
| **Audit Trail** | Every CRUD operation logged through BaseMasterService |
| **AI Interaction Logging** | AiAuditService logs every AI completion request |
| **Security Violations** | Prompt injection attempts logged as `critical` severity |
| **Log Fields** | userId, event, action, resource, details (JSON), IP, user-agent, severity |
| **Storage** | Database-backed (audit_logs table) |

### Audit Events
- `login`, `login_failed`, `logout`, `logout_all`
- `register`, `password_change`, `password_reset`
- `role_assigned`, `role_removed`
- `permission_created`, `permission_updated`, `permission_deleted`
- `permission_assigned`, `permission_revoked`
- `account_locked`, `account_unlocked`
- `user_created`, `user_deactivated`, `user_activated`
- `token_refreshed`
- `ai.security_violation`

---

## 4. AI Security

| Layer | Component | Description |
|---|---|---|
| **Injection Detection** | PromptGuardService | 20 injection patterns, 10K char limit, input sanitization |
| **Data Protection** | DataMaskService | 11 sensitive data patterns, role-aware masking |
| **Reliability** | CircuitBreakerService | Timeout, retry, fallback, circuit breaker |
| **Audit** | AiAuditService | All AI interactions logged, security violations as critical |

### PromptGuardService

Detects and rejects:
- System prompt override attempts
- Jailbreak patterns (DAN mode, developer mode)
- Code injection (exec, eval, system())
- Script injection (<script>, onerror, onload)
- Prompt redirection (forget all previous instructions)

### DataMaskService

Masks before sending to AI providers:
- Email addresses → `***@***.com`
- Phone numbers → `**********`
- PAN numbers → `*****9999*`
- GSTIN → `**XXXXX9999X*`
- Bank account numbers → `***ACCOUNT***`
- Card numbers → `****-****-****-****`
- API keys → `***MASKED***`
- Passwords → `password: ***MASKED***`
- JWT secrets → `***MASKED***`
- Tokens → `token: ***MASKED***`
- IFSC codes → `****0***********`

---

## 5. Infrastructure Security

| Layer | Technology |
|---|---|
| **HTTP Headers** | Helmet (CSP, HSTS, XSS protection, etc.) |
| **CORS** | Configured origins |
| **Rate Limiting** | @nestjs/throttler (30 req/s default) |
| **CSRF** | Double-submit cookie pattern |
| **Request Validation** | class-validator + whitelist |
| **Query Protection** | Drizzle ORM parameterized queries (no raw SQL injection) |
| **Secrets** | .env only, not in version control |
| **Environment Validation** | Zod schema validates JWT strength, DB scheme, dependency secrets at startup |
| **Docker** | Non-root containers, HEALTHCHECK, resource limits |
| **Nginx** | SSL/TLS, CSP, rate limiting (30r/s), client_max_body_size 100M |

---

## 6. Production Security Checklist

- [x] JWT_SECRET is 32+ characters
- [x] Argon2id password hashing
- [x] Account lockout after 5 failed attempts
- [x] Rate limiting on auth endpoints
- [x] Helmet security headers
- [x] CORS whitelist configured
- [x] CSRF double-submit cookie pattern
- [x] Auth audit logging enabled
- [x] CRUD audit logging enabled
- [x] AI injection detection enabled
- [x] AI data masking enabled
- [x] AI audit logging enabled
- [x] Circuit breaker for AI providers
- [x] Permission cache (60s TTL)
- [x] Environment validation at startup
- [x] Docker non-root containers
- [x] Nginx security headers + rate limiting
