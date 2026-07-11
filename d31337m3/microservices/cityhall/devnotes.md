# CityHall — Developer Notes

CityHall is the identity and authentication service for d31337m3. It handles user registration, login, Ed25519 keypair management, RBAC, and node enrollment. Built with FastAPI + SQLAlchemy (async) + Alembic on PostgreSQL.

---

## How to Run

```bash
cd microservices/cityhall

# Virtual environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Production: managed by pm2 via `ecosystem.config.js`. Not Dockerized for production.

```bash
pm2 start ecosystem.config.js --only cityhall
```

---

## Environment Variables

All prefixed with `CITYHALL_` (see `app/config.py`):

| Variable | Default | Description |
|---|---|---|
| `CITYHALL_DATABASE_URL` | `postgresql+asyncpg://cityhall:cityhall@localhost:5432/cityhall` | Async PostgreSQL DSN |
| `CITYHALL_JWT_SECRET_KEY` | `cityhall-dev-secret-key-change-in-production` | HS256 JWT signing key |
| `CITYHALL_JWT_ALGORITHM` | `HS256` | JWT algorithm |
| `CITYHALL_JWT_EXPIRE_MINUTES` | `1440` | Token TTL (24h) |
| `CITYHALL_CHAIN_STATE_PATH` | `""` | Optional chain state JSON path |
| `CITYHALL_ALLOWED_ORIGINS` | `["*"]` | CORS origins |
| `CITYHALL_RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `CITYHALL_RATE_LIMIT_MAX_REQUESTS` | `60` | Max requests per window |
| `CITYHALL_RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window |

---

## API Endpoints

Swagger: `http://localhost:8000/docs` | ReDoc: `http://localhost:8000/redoc`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Onboarding — creates user, Ed25519 keypair, returns JWT |
| `POST` | `/auth/login` | None | Username/email + password → JWT |
| `POST` | `/auth/logout` | Bearer | Audit-logged logout |
| `GET` | `/auth/challenge` | Bearer | 32-byte random hex for Ed25519 challenge |
| `POST` | `/auth/authenticate-with-key` | None | Ed25519 challenge-signature → JWT |
| `POST` | `/auth/verify-email` | None | Generate email verification token |
| `POST` | `/auth/confirm-email` | None | Confirm email with verification token |

### User

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/me` | Bearer | Current user profile |
| `PUT` | `/users/me` | Bearer | Update profile fields |
| `POST` | `/users/me/generate-keypair` | Bearer | Regenerate Ed25519 keypair (private key shown once) |
| `GET` | `/users/me/public-key` | Bearer | Get stored Ed25519 public key hex |
| `POST` | `/users/me/link-wallet` | Bearer | Link external wallet address |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Bearer admin | Paginated user list (`?page=1&page_size=50`) |
| `GET` | `/admin/users/search` | Bearer admin | Search by name/email/username/ referral code (`?q=...`) |
| `GET` | `/admin/users/{id}` | Bearer admin | Get user details (all fields) |
| `PUT` | `/admin/users/{id}` | Bearer admin | Update any user field (including roles) |
| `DELETE` | `/admin/users/{id}` | Bearer admin | Delete user (204) |
| `POST` | `/admin/users/{id}/suspend` | Bearer admin | Suspend user with reason |
| `POST` | `/admin/users/{id}/unsuspend` | Bearer admin | Unsuspend user |
| `POST` | `/admin/users/{id}/set-nodeop` | Bearer admin | Grant node operator role |
| `POST` | `/admin/users/{id}/remove-nodeop` | Bearer admin | Revoke node operator role |
| `GET` | `/admin/users/create-token` | Bearer admin | Generate one-time invitation token |
| `POST` | `/admin/users` | Bearer admin | Admin-create a user with specific roles |

### Node Enrollment

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/node-tokens` | Bearer admin | Create enrollment token (optional note + expiry) |
| `GET` | `/admin/node-tokens` | Bearer admin | List all enrollment tokens |
| `POST` | `/admin/node-tokens/{id}/revoke` | Bearer admin | Revoke an enrollment token |
| `POST` | `/admin/node-tokens/use` | None | Use token to enroll as node operator |
| `GET` | `/admin/node-operators` | Bearer admin | List all users with `is_nodeop=True` |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |

---

## Database Schema

### `users` Table

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK, auto-generated |
| `first_name` | `varchar(100)` | |
| `last_name` | `varchar(100)` | |
| `dob` | `date` | |
| `email` | `varchar(320)` | Unique, indexed |
| `username` | `varchar(100)` | Unique, indexed |
| `password_hash` | `varchar(255)` | bcrypt |
| `is_nodeop` | `bool` | |
| `is_tech_op` | `bool` | |
| `is_chat_op` | `bool` | |
| `is_user` | `bool` | Default true |
| `is_employee` | `bool` | |
| `is_admin` | `bool` | |
| `is_super_admin` | `bool` | |
| `is_suspended` | `bool` | |
| `suspended_reason` | `text` | Nullable |
| `signup_date` | `timestamptz` | `server_default=now()` |
| `founder_subscript` | `varchar(50)` | Nullable |
| `referral_code` | `varchar(50)` | Unique, indexed |
| `referred_by_code` | `varchar(50)` | Nullable |
| `ed25519_public_key` | `bytea(32)` | Nullable |
| `wallet_address` | `varchar(255)` | Nullable |
| `avatar_url` | `varchar(1024)` | Nullable |
| `bio` | `text` | Nullable |
| `email_verified` | `bool` | |
| `email_verification_token` | `varchar(255)` | Nullable |
| `enrollment_data` | `jsonb` | Form answers, schema-less |
| `extra_fields` | `jsonb` | Dynamic fields, schema-less |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updates |

### `node_enroll_tokens` Table

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` | PK, auto-generated |
| `token` | `varchar(36)` | Unique, indexed |
| `note` | `text` | Nullable |
| `used_by_user_id` | `UUID` | FK → users.id, nullable |
| `expires_at` | `timestamptz` | Nullable |
| `is_revoked` | `bool` | |
| `created_at` | `timestamptz` | `server_default=now()` |

### `audit_logs` Table

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` | PK |
| `user_id` | `UUID` | FK → users.id, nullable |
| `action` | `varchar(100)` | e.g. `user_registered`, `user_login`, `user_logout` |
| `detail` | `jsonb` | Arbitrary event context |
| `ip_address` | `varchar(45)` | IPv4 or IPv6 |
| `created_at` | `timestamptz` | |

### Schemaless Extensions

Add keys to `extra_fields` via `PUT /users/me` — no migration needed:

```json
{"extra_fields": {"preferred_timezone": "UTC", "years_experience": 5}}
```

Same for `enrollment_data` — new onboarding questions without DDL changes.

---

## Onboarding Flow

1. Client sends `POST /auth/register` with personal info, credentials, and enrollment answers
2. Server validates uniqueness (email + username), hashes password with bcrypt
3. Generates Ed25519 keypair (raw bytes stored in `ed25519_public_key`)
4. Creates unique 12-char uppercase referral code
5. Stores enrollment answers in `enrollment_data` JSONB
6. Validates referral code if provided (links via `referred_by_code`)
7. Logs to `audit_logs`, returns JWT + `user_id` + `username`

---

## Ed25519 Auth Flow

### Password-based
```
POST /auth/login  {"username": "...", "password": "..."}  → JWT
```

### Key-based
```
GET  /auth/challenge                        → {"challenge": "<64-char-hex>"}
POST /auth/authenticate-with-key
     {"public_key_hex": "...", "challenge": "...", "signature": "..."}
                                             → {"access_token": "...", ...}
```

Keypair generated on registration. Regenerate via `POST /users/me/generate-keypair`.

---

## Migrations

```bash
# Create new migration (auto-detect model changes)
alembic revision --autogenerate -m "description"

# Apply pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Testing

```bash
# From the cityhall directory
python -m pytest
```

Or with FastAPI TestClient:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.post("/auth/register", json={...})
assert response.status_code == 201
```

---

## Common Admin Tasks

```bash
# Promote a user to admin
curl -X PUT http://localhost:8000/admin/users/<UUID> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'

# Create a node enrollment token
curl -X POST http://localhost:8000/admin/node-tokens \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"note": "operator-alice"}'

# List all users
curl http://localhost:8000/admin/users?page=1&page_size=100 \
  -H "Authorization: Bearer <admin-token>"

# Search users
curl "http://localhost:8000/admin/users/search?q=alice" \
  -H "Authorization: Bearer <admin-token>"

# Suspend a user
curl -X POST http://localhost:8000/admin/users/<UUID>/suspend \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "TOS violation"}'
```

---

## Architecture Notes

- **Scope**: CityHall handles identity, auth, profiles, and blockchain key linkage only. No crawl data, no payload storage.
- **Ed25519 compatibility**: Keypairs use the same `cryptography` library as `d31337m3_chain.crypto`. Keys generated here work directly with the Sp1d3r chain.
- **Extensibility**: Two JSONB columns allow adding fields without schema changes or migrations.
- **Idempotency**: Registration checks email/username uniqueness. Login is stateless (JWT). Admin updates are idempotent.
- **Security**: bcrypt password hashing, HS256 JWTs, Ed25519 signature verification, full audit logging.
