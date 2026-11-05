# AgriSense – Phase 2: Authentication & Authorization Module

## Overview

The AgriSense Phase 2 Authentication Module delivers secure, role-based access control (RBAC) across the platform, utilizing industry-standard JSON Web Tokens (JWT) and `bcrypt` password hashing.

---

## Authentication Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register a new Farmer or Expert account |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Sign in with email and password |
| `GET` | `/api/auth/me` | Protected (`Bearer <token>`) | Retrieve current user profile and role |

---

## Security Architecture

1. **Password Hashing:**
   - Handled via `bcryptjs` with 12 salt rounds.
   - Plaintext passwords are never persisted.
   - `passwordHash` is configured with `select: false` on Mongoose schema and stripped via custom `toJSON` transform.

2. **Admin Self-Registration Prevention:**
   - Both client and server reject any attempt to register with `role: "admin"` via the public registration API.
   - Allowed public roles: `farmer`, `expert`.

3. **Rate Limiting & Brute-Force Protection:**
   - `express-rate-limit` throttles repeated login and registration attempts (50 requests per 15 minutes window).

4. **JWT Verification Middleware:**
   - `protect`: Validates `Authorization: Bearer <token>` headers, checks token expiration and verifies user status.
   - `authorize(...roles)`: Enforces role permissions on restricted endpoints.

5. **Token Storage Strategy:**
   - Frontend supports "Remember Me".
   - If enabled: persists in `localStorage`.
   - If disabled: persists in `sessionStorage`.

---

## Creating the First Administrator Account

Because Admin self-registration is strictly disallowed via public API, create administrator accounts securely via the server CLI:

```bash
cd server
node src/scripts/createAdmin.js --name "Admin Name" --email "admin@agrisense.com" --password "YourStrongPassword123!" --phone "+1-555-0199" --location "Headquarters"
```

If the user already exists, the script safely upgrades their role to `admin` and updates the password hash without duplicating records.

