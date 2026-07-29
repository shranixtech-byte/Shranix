# Environment Loading Root Cause

## Root cause

`backend/src/config/config.module.ts` passed relative filenames to
`ConfigModule.forRoot()`:

```ts
['.env.local', '.env', '.env.development']
```

Nest's config loader uses each supplied path directly. It does not resolve
explicit `envFilePath` entries against the repository root. The backend's
package script runs with this working directory:

```text
C:\Project\SHRANIX-KRUSHI-ERP\backend
```

Therefore the loader looked for these nonexistent files:

```text
C:\Project\SHRANIX-KRUSHI-ERP\backend\.env.local
C:\Project\SHRANIX-KRUSHI-ERP\backend\.env
C:\Project\SHRANIX-KRUSHI-ERP\backend\.env.development
```

The real files are in `C:\Project\SHRANIX-KRUSHI-ERP`. No environment file
was loaded, so `process.env.JWT_SECRET` was absent when Nest instantiated the
`JwtModule.registerAsync()` factory. Its required-secret guard then threw the
bootstrap error.

## Files changed

- `backend/src/config/config.module.ts`
- `reports/ENV_LOADING_ROOT_CAUSE.md`

## Fix

The config module now resolves the same ordered list of files to absolute paths
from the repository root. The module is three directories below that root in
both source and compiled output (`src/config` and `dist/config`), so the
calculation is stable for `nest start --watch` and `node dist/main`.

```ts
const projectRoot = resolve(__dirname, '../../..');
const envFilePath = ['.env.local', '.env', '.env.development'].map((file) =>
  resolve(projectRoot, file),
);
```

This keeps the existing precedence and security behavior unchanged:

1. `.env.local` has highest precedence.
2. `.env` is considered next when present.
3. `.env.development` supplies variables not set by the higher-priority files.
4. Existing operating-system environment variables still take precedence.
5. No secret was hardcoded, no fallback was added, and no validation or guard
   was bypassed.

## Configuration loading flow

1. `npm run dev` executes the backend package's `nest start --watch` command.
   Its working directory is `C:\Project\SHRANIX-KRUSHI-ERP\backend`, not the
   project root.
2. Nest compiles and runs `backend/dist/main.js`; `bootstrap()` calls
   `NestFactory.create(AppModule)`.
3. `AppModule` includes the application's `ConfigModule`. Evaluating that
   module calls `NestConfigModule.forRoot()` before providers are initialized.
4. `forRoot()` reads the absolute root-level file list and adds its values to
   `process.env`. Its `ConfigService` is global.
5. Nest initializes `AuthModule`. The `JwtModule.registerAsync()` factory
   receives that `ConfigService`, and `config.get('JWT_SECRET')` now returns
   the value loaded from `.env.development` (unless a higher-priority source
   supplied one).
6. The JWT module and strategy initialize with the loaded secret; bootstrap can
   proceed to `app.listen()`.

`AuthModule`'s import of `ConfigModule` was not the failure point. The value
had already disappeared at file lookup: all relative paths were resolved under
`backend`, while every configured environment file lives at the project root.

## Runtime diagnostic output

Diagnostic run from the backend package after the change:

```text
process.cwd(): C:\Project\SHRANIX-KRUSHI-ERP\backend
__dirname (compiled config module): C:\Project\SHRANIX-KRUSHI-ERP\backend\dist\config
resolved env file paths:
  C:\Project\SHRANIX-KRUSHI-ERP\.env.local
  C:\Project\SHRANIX-KRUSHI-ERP\.env
  C:\Project\SHRANIX-KRUSHI-ERP\.env.development
process.env.JWT_SECRET: [present; redacted; length=31]
configService.get('JWT_SECRET'): [present; redacted; length=31]
```

The secret value is intentionally redacted in diagnostics and this report.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` in `backend` | Passed. |
| Backend configuration diagnostic from `backend` CWD | Passed; both `process.env` and `ConfigService` contain `JWT_SECRET`. |
| `npm run start:dev` in `backend` | Not available: `backend/package.json` has no `start:dev` script. No alias was added because it is unrelated to the environment-loading defect. |
| Existing equivalent `npm run dev` | Passed; backend stayed up and `GET /v1/health/live` returned HTTP 200. |
| Login API | Passed; `POST /api/v1/auth/login` returned HTTP 200, an access token, refresh token, refresh cookie, and CSRF cookie. |
| JWT verification | Passed; `POST /api/v1/auth/me` with the returned bearer token and matching CSRF token returned HTTP 200. |
| `npm run build` in `frontend` | Passed. |
| Frontend login runtime | Failed for an independent, pre-existing integration defect. The client calls `/auth/login`; Vite proxies only `/api`, while Nest exposes `/api/v1/auth/login`. The actual frontend request returned HTTP 404. The client also expects an unwrapped auth response although the backend's global response interceptor wraps it in `{ success, data, ... }`. This was intentionally not changed because the requested fix was limited to the JWT environment-loading root cause. |

