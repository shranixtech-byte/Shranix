# Security Policy

## Supported Versions

We provide security updates for the latest stable release and the current release candidate.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | ✅ (latest stable) |
| < 1.0   | ❌                 |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, report them privately to **[security@shranix.com](mailto:security@shranix.com)**.

Please include:

- The affected **version(s)**
- A **description** of the vulnerability and its potential impact
- **Steps to reproduce** (without including live credentials or customer data)
- Whether it has been disclosed publicly

### What happens next

1. We will acknowledge your report within **48 hours**.
2. We will investigate and provide an initial assessment within **5 business days**.
3. We will coordinate a fix and a responsible disclosure timeline with you.
4. We will credit you in the release notes (unless you prefer to remain anonymous).

We ask that you **do not publicly disclose** the issue until we have shipped a fix, so that we can protect our users.

---

## Security Best Practices (for developers & deployers)

### Required in production

- **`JWT_SECRET`** must be ≥ 32 random characters. Generate with:
  ```bash
  openssl rand -base64 48
  ```
- **`DATABASE_URL`** must use `postgresql://` with strong credentials and TLS (`?sslmode=require`).
- **All services behind TLS** — the included `nginx.conf` enforces HTTPS + HSTS.
- **Rotate secrets** — use a secret manager (e.g. GitHub Actions secrets, Docker secrets, Vault).

### Secrets management

- Never commit `.env`, `.env.local`, `*.pem`, `*.key`, or credentials to git — the `.gitignore` blocks these.
- Never log tokens, passwords, API keys, or full JWT payloads. The backend's `DataMaskService` masks sensitive data in AI requests; the logging interceptor redacts request bodies.
- Use `SENDGRID_API_KEY` / SMTP credentials only through environment variables.

### Hardened baseline

The application ships with these protections enabled by default:

- `helmet` security headers (CSP, HSTS, X-Frame-Options, etc.)
- `ThrottlerGuard` rate limiting
- `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` (RBAC)
- `CsrfGuard` for state-changing requests
- Global `ValidationPipe` with DTO validation
- Global exception filter that never leaks internal error details
- Startup environment validation (warns on weak `JWT_SECRET`, unexpected DB scheme)
- Argon2 password hashing

---

## Dependency & Supply Chain

- Dependencies are pinned via `pnpm-lock.yaml`; CI installs with `--frozen-lockfile`.
- CI runs on every push/PR: lint → typecheck → unit tests → build.
- Dependabot / Renovate configuration can be added on request.

---

## Known Security Notes

- The bundled dev database (`*.db`) files and seed credentials (`admin@shranix.com` / `admin123`) are **development-only**. They are never to be used in production. The first action after seeding a production database should be changing the admin password.
- AI provider API keys are optional; when unused, leave them empty.

---

_Maintained by the SHRANIX Technologies security team. Contact: [security@shranix.com](mailto:security@shranix.com)._
