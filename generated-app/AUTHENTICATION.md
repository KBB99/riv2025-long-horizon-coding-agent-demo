# Authentication

This document explains how authentication works in the Canopy project management application.

---

## Overview

Canopy uses a **token-based authentication** system built entirely with Node.js built-in `crypto` module — no external auth libraries (like `jsonwebtoken` or `bcrypt`) are required. Users register with an email and password, receive a signed token, and include that token in subsequent API requests via the `Authorization` header.

## Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌───────────┐
│   Frontend   │──HTTP──│  API Gateway     │──────▶│  Lambda    │
│   (React)    │        │  (CORS enabled)  │       │  Handlers  │
└──────┬───────┘        └──────────────────┘        └─────┬─────┘
       │                                                   │
       │  localStorage                              DynamoDB│
       │  stores token                         (single-table│design)
       │                                                   │
       ▼                                                   ▼
  canopy_auth_token                              USER# / EMAIL# records
```

### Components

| Layer          | File(s)                                    | Responsibility                          |
|----------------|--------------------------------------------|-----------------------------------------|
| **Schemas**    | `shared/src/schemas/auth.ts`               | Zod validation for register, login, user, token response |
| **Endpoints**  | `shared/src/endpoints.ts`                  | Route definitions: `/auth/register`, `/auth/login`, `/auth/me` |
| **Backend**    | `backend/src/handlers/auth.ts`             | Lambda handlers for register, login, getMe |
| **API Client** | `frontend/src/api/client.ts`               | HTTP functions + automatic token injection |
| **Auth State** | `frontend/src/context/AuthContext.tsx`      | React context providing auth state + actions |
| **Pages**      | `frontend/src/pages/Login.tsx`, `Signup.tsx`| Login and registration forms |
| **Routing**    | `frontend/src/App.tsx`                     | `RequireAuth` wrapper that guards protected routes |

---

## API Endpoints

### `POST /auth/register`

Creates a new user account.

**Request body** (validated by `RegisterSchema`):

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Validation rules:**
- `name` — required, 1–100 characters
- `email` — must be a valid email address
- `password` — 6–128 characters

**Response** (`201 Created`):

```json
{
  "token": "<signed-token>",
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "member",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Error cases:**
- `400` — Validation error (missing/invalid fields)
- `409` — Email already registered (`EMAIL_EXISTS`)

---

### `POST /auth/login`

Authenticates an existing user.

**Request body** (validated by `LoginSchema`):

```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Response** (`200 OK`):

```json
{
  "token": "<signed-token>",
  "user": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "member",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Error cases:**
- `400` — Validation error
- `401` — Invalid email or password (`INVALID_CREDENTIALS`)

---

### `GET /auth/me`

Returns the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response** (`200 OK`):

```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "member",
  "createdAt": "2026-01-15T10:30:00.000Z"
}
```

**Error cases:**
- `401` — Missing or invalid/expired token (`UNAUTHORIZED`)
- `404` — User not found (`NOT_FOUND`)

---

## Password Hashing

Passwords are **never stored in plain text**. The system uses SHA-256 hashing with a random salt:

1. **Registration:** A 32-byte random salt is generated via `crypto.randomBytes()`. The password is concatenated with the salt, then hashed using `crypto.createHash('sha256')`. Both the hash and salt are stored in DynamoDB.

2. **Login:** The stored salt is retrieved, the submitted password is hashed with the same salt, and the result is compared to the stored hash using `crypto.timingSafeEqual()` to prevent timing attacks.

```
password + salt  →  SHA-256  →  stored hash
                                    ↕  (timing-safe comparison)
password + salt  →  SHA-256  →  computed hash
```

### DynamoDB Storage

User records are stored in a single-table design:

| Record Type | PK              | SK             | Attributes                                    |
|-------------|-----------------|----------------|-----------------------------------------------|
| User        | `USER#<uuid>`   | `METADATA`     | id, name, email, passwordHash, passwordSalt, role, createdAt |
| Email Lookup| `EMAIL#<email>` | `USER_LOOKUP`  | userId                                        |

The `EMAIL#` lookup record enables checking for duplicate emails and resolving email → userId during login, without requiring a GSI.

---

## Token System

Tokens are **HMAC-SHA256 signed** payloads — a lightweight alternative to JWTs, using only Node.js `crypto`:

### Token Structure

```
<base64url-encoded-payload>.<base64url-signature>
```

**Payload contents:**
```json
{
  "userId": "uuid",
  "email": "jane@example.com",
  "exp": 1737936000000
}
```

### Token Lifecycle

1. **Creation** — On successful register or login, a token is generated:
   - The payload (userId, email, expiration) is base64url-encoded
   - An HMAC-SHA256 signature is computed over the encoded payload using `TOKEN_SECRET`
   - The two parts are joined with a `.` separator

2. **Verification** — On each authenticated request:
   - The token is split into payload and signature
   - The signature is recomputed and compared to the provided one
   - The expiration timestamp is checked against `Date.now()`
   - If valid, the userId is extracted and used to fetch the user record

3. **Expiration** — Tokens expire after **7 days** (`TOKEN_EXPIRY_HOURS = 168`)

### Token Secret

The signing secret is loaded from the `TOKEN_SECRET` environment variable, falling back to a hardcoded default for development. In production, this should be stored in **AWS Secrets Manager** or **SSM Parameter Store**.

---

## Frontend Auth Flow

### Token Storage

The auth token is stored in `localStorage` under the key `canopy_auth_token`. Helper functions in `frontend/src/api/client.ts` manage this:

- `getAuthToken()` — reads the token from localStorage
- `setAuthToken(token)` — saves or removes the token

### Automatic Token Injection

Every API request made through the `request()` function in the API client automatically includes the token:

```
Authorization: Bearer <token>
```

This happens transparently — individual API call sites don't need to handle auth headers.

### Auth Context (`AuthProvider`)

The React `AuthContext` provides authentication state and actions to the entire app:

**State:**
- `user` — the authenticated user object (or `null`)
- `isAuthenticated` — boolean
- `isLoading` — true during initial token check or login/register
- `error` — error message string (or `null`)

**Actions:**
- `login(email, password)` — calls `/auth/login`, stores token, sets user
- `register(name, email, password)` — calls `/auth/register`, stores token, sets user
- `logout()` — clears token from localStorage, resets state
- `clearError()` — dismisses error messages

### Startup Flow

When the app loads:

```
App mounts
  └─▶ AuthProvider useEffect runs
       └─▶ Check localStorage for canopy_auth_token
            ├─ No token → isLoading = false, show login
            └─ Token found → call GET /auth/me
                 ├─ Success → set user, isAuthenticated = true
                 └─ Failure (401) → clear token, show login
```

### Route Protection

The `RequireAuth` component in `App.tsx` wraps all protected routes. If the user is not authenticated, they are redirected to `/login`. Public routes (`/login`, `/signup`) are accessible without a token.

```
/login     → Login page (public)
/signup    → Signup page (public)
/*         → RequireAuth → App content (protected)
```

---

## User Roles

Users have a `role` field with three possible values:

| Role     | Description                     |
|----------|---------------------------------|
| `admin`  | Full access (future use)        |
| `member` | Standard user (default)         |
| `viewer` | Read-only access (future use)   |

Currently, all registered users receive the `member` role. Role-based access control is defined in the schema but not yet enforced at the API level — all authenticated users have equal permissions.

---

## Security Considerations

| Concern                 | Mitigation                                                        |
|-------------------------|-------------------------------------------------------------------|
| Password storage        | SHA-256 hashed with unique random salt per user                  |
| Timing attacks          | `crypto.timingSafeEqual()` for password comparison               |
| Token forgery           | HMAC-SHA256 signature verification                               |
| Token expiry            | 7-day TTL checked on every request                               |
| Email enumeration       | Same error message for wrong email vs. wrong password            |
| XSS token theft         | Token in localStorage (consider HttpOnly cookies for production) |
| CORS                    | API Gateway configured with CORS headers                         |
| Input validation        | All inputs validated with Zod schemas before processing          |

### Production Recommendations

1. **Use a strong, rotatable secret** — Store `TOKEN_SECRET` in AWS Secrets Manager instead of an environment variable
2. **Upgrade password hashing** — Consider `scrypt` or `argon2` for stronger key derivation (SHA-256 is fast but less resistant to brute force)
3. **Add rate limiting** — Protect `/auth/login` from brute-force attempts (e.g., via API Gateway throttling or WAF)
4. **Use HttpOnly cookies** — Move token storage from localStorage to HttpOnly cookies to mitigate XSS attacks
5. **Add refresh tokens** — Implement short-lived access tokens with a refresh token rotation scheme
6. **Enable MFA** — Add TOTP-based multi-factor authentication for sensitive accounts
