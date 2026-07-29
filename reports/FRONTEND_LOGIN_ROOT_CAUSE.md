# Frontend Login Root Cause

## Root cause

The Sign In request path was owned by the frontend auth client, not the login
route or the backend:

```ts
const API_BASE = '/auth';
```

That hardcoded value made `authService.login()` post to `/auth/login`, bypassing
`VITE_API_URL` entirely. It therefore could neither use the versioned backend
route nor the Vite `/api` proxy.

Two associated client-side integration defects also prevented a successful
login after correcting only the URL:

1. The frontend package has no local `.env` files. Vite's default environment
   directory is the frontend package, while `VITE_API_URL` lives in the
   repository root. The configured development value was never loaded by the
   frontend dev server.
2. The backend returns successful responses as `{ success, data, ... }`, but
   `authService.login()` treated the response as an unwrapped `AuthResponse`.
   `body.tokens` was therefore undefined and no tokens could be stored.

The repository also retains emitted `.js` files beside the TypeScript sources.
Vite resolves the existing `auth.service.js` before `auth.service.ts`. A
button-level test after the TypeScript-only edit still called `/auth/login`,
which proved that the emitted runtime module had to be regenerated. The normal
frontend build performs that TypeScript compilation.

## Request trace

1. `LoginPage` renders a form whose **Sign in** button submits
   `handleSubmit()`.
2. `handleSubmit()` calls `useAuth().login({ email, password })`.
3. `AuthProvider.login()` calls `authService.login(data)` and assigns the
   returned `user` to context state.
4. `authService.login()` uses `fetch`; there is no Axios client in this flow.
5. The corrected API base is
   `${VITE_API_URL}/auth`. In development it resolves to
   `http://localhost:3001/api/v1/auth`, so login posts to
   `http://localhost:3001/api/v1/auth/login`.
6. The service unwraps `response.data`, stores `access_token` and
   `refresh_token` in local storage, returns the user to `AuthProvider`, and
   `LoginPage` calls `navigate('/')`. The root route is the protected dashboard
   route.

## Environment and proxy trace

- Repository-root `.env.development` defines
  `VITE_API_URL=http://localhost:3001/api/v1`.
- Repository-root `.env.local` leaves that setting commented out, so it does
  not override the development URL.
- The `frontend` directory has no `.env*` files. Before the fix, Vite did not
  load the root value because its default `envDir` was the package directory.
- `vite.config.ts` now sets `envDir: path.resolve(__dirname, '..')`, so Vite
  loads the existing root environment files.
- The existing proxy forwards `/api` to `http://localhost:3001`. It was not
  changed: in development `VITE_API_URL` is absolute, so the auth client goes
  directly to the backend as required. The `/api/v1` fallback remains usable
  through that proxy when no public API URL is supplied.

## Files changed

- `frontend/vite.config.ts`
  - Reads the existing repository-root Vite environment files.
- `frontend/src/services/auth.service.ts`
  - Uses `VITE_API_URL` for the auth base path and unwraps the backend login
    response before storing tokens.
- `frontend/src/pages/auth/login.test.tsx`
  - Adds a button-level integration test for the actual login client path.
- `reports/FRONTEND_LOGIN_ROOT_CAUSE.md`

The frontend build regenerated the matching emitted JavaScript artifacts that
this repository keeps beside its TypeScript sources. No backend files or proxy
rules were changed.

## Why the fix works

The auth client now has one configured base URL instead of a hardcoded,
unversioned route. The development environment supplies the exact backend base
URL, and Vite is configured to read that environment from its actual location.
Unwrapping the backend's response envelope gives `setTokens()` the real access
and refresh tokens, allowing `AuthProvider` to authenticate the user and the
login page to navigate to the dashboard.

## Verification

| Check                                       | Result                                                                                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend production build                   | Passed: `npm run build`.                                                                                                                                                                                 |
| Root environment loading in Vite dev server | Passed: the served auth module contained `http://localhost:3001/api/v1`.                                                                                                                                 |
| Sign In interaction                         | Passed through a rendered `LoginPage`, `AuthProvider`, and `MemoryRouter`. Clicking **Sign in** issued a real native-fetch request (wrapped only by a spy) to `http://localhost:3001/api/v1/auth/login`. |
| Backend login response                      | Passed: the local backend returned a successful auth response; the client unwrapped it.                                                                                                                  |
| Token storage                               | Passed: `access_token` and `refresh_token` were both present in local storage after login.                                                                                                               |
| Redirect                                    | Passed: the route navigated to `/` and rendered the dashboard marker.                                                                                                                                    |

The in-app browser surface was unavailable in this environment, so browser
automation could not be used. The integration test exercises the same rendered
button, context, auth client, local storage, route transition, and real local
backend request without mocking the auth response.
