# ConfigFlow Backend — Full Security Stack

## Architecture

```
backend/
├── src/
│   ├── config/env.ts            # Zod-validated environment config
│   ├── database/
│   │   ├── connection.ts        # Knex DB abstraction (PG ↔ MySQL switch)
│   │   ├── migrate.ts           # Migration runner
│   │   ├── seed.ts              # Seed runner
│   │   ├── migrations/001_initial.ts  # All tables
│   │   └── seeds/001_initial.ts       # Default roles, permissions, admin user
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT auth, RBAC, request logging, error handler
│   │   └── security.middleware.ts # Device fingerprint, IP tracking, security headers
│   ├── routes/
│   │   ├── auth.routes.ts       # Register, login, refresh, logout, change password
│   │   ├── user.routes.ts       # User CRUD, role management, device management
│   │   ├── config.routes.ts     # Configuration CRUD with encryption & DOMPurify
│   │   └── audit.routes.ts      # Audit logs & security dashboard
│   ├── services/
│   │   └── auth.service.ts      # Argon2, JWT, account lock, device fingerprint, RBAC, AES-256-GCM encryption
│   ├── utils/
│   │   └── logger.ts            # Winston logger with sensitive field redaction
│   └── server.ts                # Express app with helmet, CORS, CSRF, rate limiting, session
├── package.json
├── tsconfig.json
└── .env.example
```

## Security Layers Implemented

| Layer | Implementation |
|---|---|
| Password hashing | Argon2id (64MB memory, 3 iterations) |
| Password complexity | Min 12 chars, upper/lower/digit/special, no repeats, no common words |
| Account lock | Locks after 5 failed attempts for 30 minutes |
| JWT auth | Access token (15min) + Refresh token (7d) with rotation |
| Session | express-session with secure cookie flags |
| CSRF | Double-submit cookie pattern via csrf-csrf |
| Rate limiting | Global (200/15min), Auth (15/15min), Strict (5/min) |
| RBAC | Roles (admin/editor/viewer) + granular permissions (resource:action) |
| Device fingerprinting | Server-side + client-side, trusted device tracking |
| Encrypted configs | AES-256-GCM with scrypt key derivation |
| Input sanitization | Zod validation + DOMPurify for all string inputs |
| Security headers | Helmet + custom headers (CSP, HSTS, X-Frame-Options, etc.) |
| Audit logging | Winston with sensitive field redaction + DB audit trail |
| Secure cookies | httpOnly, secure, sameSite=strict |

## Database Switch (PostgreSQL ↔ MySQL)

Change `DB_CLIENT` in `.env`:
```
DB_CLIENT=pg      # PostgreSQL
DB_CLIENT=mysql2  # MySQL
```

Update the corresponding connection credentials and restart.

## Quick Start

```bash
cd backend
cp .env.example .env   # Edit with your values
npm install
npm run migrate         # Create tables
npm run seed            # Create admin user + roles
npm run dev             # Start with hot reload
```

## Default Admin
- Email: `admin@configflow.dev`
- Password: `Admin@12345678!`

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (returns JWT + sets refresh cookie)
- `POST /api/auth/refresh` — Rotate tokens
- `POST /api/auth/logout` — Revoke all tokens
- `POST /api/auth/change-password` — Change password (requires auth)
- `GET /api/auth/me` — Current user profile

### Users (admin)
- `GET /api/users` — List all users
- `GET /api/users/:id` — Get user details
- `PATCH /api/users/:id` — Update user
- `POST /api/users/:id/roles` — Assign role
- `DELETE /api/users/:id/roles/:roleName` — Remove role
- `POST /api/users/:id/unlock` — Unlock account
- `GET /api/users/:id/devices` — List devices

### Configurations
- `GET /api/configurations` — List (with pagination & status filter)
- `GET /api/configurations/:id` — Get (with decryption via X-Encryption-Key header)
- `POST /api/configurations` — Create (with optional encryption)
- `PUT /api/configurations/:id` — Update (with versioning)
- `DELETE /api/configurations/:id` — Delete

### Security
- `GET /api/csrf-token` — Get CSRF token
- `GET /api/audit` — Audit logs (admin, with filters)
- `GET /api/audit/dashboard` — Security dashboard (admin)
- `GET /api/health` — Health check
