# Axly DSA Tracker — Authentication & Security

## Authentication Methods

### 1. Email/Password Authentication
- **Signup:** Email + password → OTP verification → account created
- **Login:** Email + password → JWT issued (30-day expiry)
- **Password Reset:** Email → reset token → new password

### 2. Google OAuth (Supabase)
- **Flow:** Supabase PKCE → JWT → backend verification
- **User Provisioning:** Auto-created on first login
- **Fallback:** Backend accepts Supabase JWT directly

### 3. Dev Login (Non-Production)
- **Endpoint:** `POST /api/v1/auth/dev-login`
- **Behavior:** Fast login without password
- **Restriction:** Only available when `NODE_ENV !== 'production'`

---

## JWT Authentication

### Token Structure
- **Signing:** `jsonwebtoken` with `JWT_SECRET`
- **Expiry:** 30 days (configurable via `JWT_EXPIRES_IN`)
- **Payload:** `{ id, name, email, role }`

### Verification Flow
1. Extract `Bearer <token>` from `Authorization` header
2. Attempt `jwt.verify()` with `JWT_SECRET`
3. On failure, fall back to `supabaseClient.auth.getUser(token)`
4. If user not in DB, auto-provision from token claims
5. If email matches `ADMIN_EMAIL`, force-promote to admin
6. Attach `req.user` and call `next()`

### Known Issues
- Hardcoded JWT secret fallback in non-production
- No token revocation mechanism
- Silent admin promotion without audit trail

---

## Role-Based Access Control (RBAC)

### Roles
| Role | Description |
|------|-------------|
| `admin` | Full access to all resources |
| `mentor` | Can review submissions |
| `user` | Student access (default) |

### Implementation
- `requireRole(...roles)` middleware
- Checks `req.user.role` against allowed list
- Returns 401 if no user, 403 if wrong role

### Protected Routes
- Admin-only: Question CRUD, DC management, user management, audit logs
- Mentor+: Submission review
- Authenticated: Practice, DC, submissions, analytics, leaderboard

---

## Rate Limiting

### Limiters
| Limiter | Window | Max (Prod) | Applied To |
|---------|--------|------------|------------|
| `authRateLimiter` | 15 min | 500 | Auth endpoints |
| `executionRateLimiter` | 1 min | 30 | Code execution |
| `submissionRateLimiter` | 1 min | 20 | Code submission |
| `aiRateLimiter` | 1 min | 10 | AI endpoints |
| Global | 15 min | 500 | All endpoints |

### Known Issues
- In-memory store (resets on restart)
- Ineffective in multi-instance deployments
- IP-based keying (shared proxy problem)

---

## CORS Configuration

### Allowlist
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000`
- `http://localhost:5000`
- `https://dsatracker.axly.in`
- `CLIENT_ORIGIN` env var

### Known Issue
- Requests with no `Origin` header are allowed (bypasses CORS)

---

## Security Headers (Helmet)

Applied via `helmet()` middleware:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security` (if HTTPS)
- `Content-Security-Policy` (defaults)

---

## Input Validation

### Zod Schemas
- `createQuestionSchema`, `updateQuestionSchema`
- `runCodeSchema` (source_code: 100KB max, custom_input: 10KB max)
- `submitCodeSchema`
- `githubSubmissionSchema`
- `reviewSubmissionSchema`
- `paginationSchema` (limit: max 100)

### Known Issues
- Only first validation error returned
- No route param validation (e.g., `:id`)
- No max length on several string fields

---

## Audit Logging

### Implementation
- `auditService.logAction()` records admin actions
- Writes to `admin_audit_logs` table
- Includes: actor, action, resource, before/after data, IP, user agent
- Sanitizes sensitive fields (passwords, tokens)

### Known Issue
- Opt-in — not middleware-enforced

---

## Code Execution Security

### Docker Runner
- **Isolation:** Non-root user, read-only filesystem
- **Resource Limits:** 256MB RAM, 64 PIDs, 1 CPU
- **Timeouts:** 5s execution, 10s compilation
- **Network:** Isolated `runner_internal` network
- **Filesystem:** tmpfs mounts with noexec on /tmp

### Input Limits
- Source code: 100KB
- Test input: 20KB per test
- Output: 64KB
- Test cases: max 20
- Request body: 500KB

---

## Email Security

### OTP
- Generated server-side
- Sent via Resend API
- Expires after use
- Rate limited via auth rate limiter

### Known Issues
- OTP not sanitized for HTML injection
- No service-level email rate limiting

---

## Secrets Management

### Environment Variables
- All secrets in `.env` files (not committed)
- `.env.example` provided with placeholder values
- No startup validation (missing vars cause runtime crashes)

### Known Issues
- `ADMIN_BOOTSTRAP_ENABLED` can leave bootstrap open in production
- No `.env` schema validation on startup
