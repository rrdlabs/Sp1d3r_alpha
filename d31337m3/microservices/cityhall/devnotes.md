# CityHall — Dev Notes

## Quick Start

```bash
# 1. Start PostgreSQL + app via Docker
cd cityhall
docker compose up -d --build

# 2. Or manually (PostgreSQL must be running on :5432)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

All configurable via env vars with `CITYHALL_` prefix (see `app/config.py`):

| Variable | Default | Description |
|---|---|---|
| `CITYHALL_DATABASE_URL` | `postgresql+asyncpg://cityhall:cityhall@localhost:5432/cityhall` | DSN for asyncpg |
| `CITYHALL_JWT_SECRET_KEY` | `cityhall-dev-secret-key-...` | HS256 signing key |
| `CITYHALL_JWT_EXPIRE_MINUTES` | `1440` | Token TTL (24h) |
| `CITYHALL_CHAIN_STATE_PATH` | `""` | Path to chain state JSON (optional blockchain linkage) |
| `CITYHALL_ALLOWED_ORIGINS` | `["*"]` | CORS origins |

## API Reference

Swagger docs: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Onboarding — creates user, generates Ed25519 keypair, returns JWT |
| `POST` | `/auth/login` | None | Username/email + password → JWT |
| `POST` | `/auth/logout` | Bearer | Audit-logged logout |
| `GET` | `/auth/challenge` | Bearer | 32-byte random hex for Ed25519 challenge |
| `POST` | `/auth/authenticate-with-key` | None | Ed25519 challenge-signature → JWT |

### User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users/me` | Bearer | Current user profile |
| `PUT` | `/users/me` | Bearer | Update profile fields |
| `POST` | `/users/me/generate-keypair` | Bearer | Generate new Ed25519 keypair (private key shown once) |
| `GET` | `/users/me/public-key` | Bearer | Get stored Ed25519 public key hex |
| `POST` | `/users/me/link-wallet` | Bearer | Link external wallet address |

### Admin Endpoints (requires `is_admin` or `is_super_admin`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | Bearer admin | Paginated user list (`?page=1&page_size=50`) |
| `GET` | `/admin/users/search` | Bearer admin | Search by name/email/username (`?q=...`) |
| `GET` | `/admin/users/{id}` | Bearer admin | Get user details (all fields) |
| `PUT` | `/admin/users/{id}` | Bearer admin | Update any user field (including roles) |
| `DELETE` | `/admin/users/{id}` | Bearer admin | Delete user (returns 204) |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |

## Onboarding Flow

1. Client sends `POST /auth/register` with:
   - `first_name`, `last_name`, `dob`, `email`, `username`, `password`, `confirm_password`
   - Enrollment answers: `volunteer_node_op`, `volunteer_tech_support`, `volunteer_chat_support`, `has_high_speed_connection`, `always_on_available`
   - Optional: `founder_subscript`, `referral_code`, `bio`, `extra_fields` (arbitrary JSON)

2. Server:
   - Validates input (passwords match, username/email unique)
   - Hashes password with bcrypt
   - Generates Ed25519 keypair (private raw + public raw)
   - Creates a unique 12-char uppercase referral code
   - Stores enrollment answers in `enrollment_data` JSONB column
   - Validates referral code if provided (links via `referred_by_code`)
   - Logs to `audit_logs`
   - Returns JWT + `user_id` + `username`

## Database Schema

### `users` table (fixed columns)

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
| `signup_date` | `timestamptz` | `server_default=now()` |
| `founder_subscript` | `varchar(50)` | Nullable |
| `referral_code` | `varchar(50)` | Unique, indexed |
| `referred_by_code` | `varchar(50)` | Nullable |
| `ed25519_public_key` | `bytea(32)` | Nullable |
| `wallet_address` | `varchar(255)` | Nullable |
| `avatar_url` | `varchar(1024)` | Nullable |
| `bio` | `text` | Nullable |
| `enrollment_data` | `jsonb` | Form answers, schema-less |
| `extra_fields` | `jsonb` | Dynamic fields, schema-less |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updates |

### `audit_logs` table

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` | PK |
| `user_id` | `UUID` | FK → users.id, nullable (anonymous actions) |
| `action` | `varchar(100)` | e.g. `user_registered`, `user_login`, `user_logout` |
| `detail` | `jsonb` | Arbitrary event context |
| `ip_address` | `varchar(45)` | IPv4 or IPv6 |
| `created_at` | `timestamptz` | |

### Adding new fields (no migration needed)

Add keys to `extra_fields` JSONB on registration or via `PUT /users/me`:

```json
{
  "extra_fields": {
    "preferred_timezone": "UTC",
    "years_experience": 5,
    "referral_source": "twitter"
  }
}
```

For new enrollment questions, add keys to `enrollment_data`:

```json
{
  "enrollment_data": {
    "has_previous_node_experience": true,
    "preferred_contact_method": "discord"
  }
}
```

No DDL changes, no migrations, no code changes needed.

## Ed25519 / Blockchain Auth Flow

### Password-based (default)
`POST /auth/login` with `{"username": "...", "password": "..."}` → JWT.

### Key-based (same crypto as d31337m3 chain)
```
GET /auth/challenge                   → {"challenge": "<32-byte-hex>"}
# Client signs challenge with Ed25519 private key:
#   signature = ed25519.sign(private_key, bytes.fromhex(challenge))
POST /auth/authenticate-with-key
  {"public_key_hex": "...", "challenge": "...", "signature": "..."}
                                       → {"access_token": "...", ...}
```

Keypair generated on registration automatically. Regenerate via `POST /users/me/generate-keypair`.

## Role System

Roles are additive, stored as boolean columns:

| Role | Set by | Grants access to |
|---|---|---|
| `is_user` | Default on register | Profile endpoints |
| `is_nodeop` | Admin | (Future: node operator dashboard) |
| `is_tech_op` | Admin | (Future: tech support tools) |
| `is_chat_op` | Admin | (Future: chat moderation) |
| `is_employee` | Admin | Internal flag |
| `is_admin` | Admin | `GET/PUT/DELETE /admin/users/*` |
| `is_super_admin` | Admin only | All admin + can promote other admins |

Only `is_super_admin` users can promote others to `is_admin` or `is_super_admin`. Enforce this in business logic if needed; the API does not yet enforce the super-admin-only promotion restriction.

## Migrations

```bash
# Create a new migration (auto-detect model changes)
alembic revision --autogenerate -m "description"

# Apply pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

## Common Admin Tasks

### Promote a user to admin
```bash
curl -X PUT http://localhost:8000/admin/users/<UUID> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'
```

### List all users
```bash
curl http://localhost:8000/admin/users?page=1&page_size=100 \
  -H "Authorization: Bearer <admin-token>"
```

### Search users
```bash
curl "http://localhost:8000/admin/users/search?q=alice" \
  -H "Authorization: Bearer <admin-token>"
```

### Delete a user
```bash
curl -X DELETE http://localhost:8000/admin/users/<UUID> \
  -H "Authorization: Bearer <admin-token>"
```

## Testing

```bash
# Unit tests (TBD — tests are in the parent project's test suite)
python -m pytest   # if pytest is installed
```

The microservice is designed to be testable with FastAPI's `TestClient`:

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.post("/auth/register", json={...})
assert response.status_code == 201
```

## Architecture Notes

- **Scope boundary**: CityHall only handles user identity, auth, profiles, and blockchain key linkage. No crawl data, no payload storage, no encrypted findings.
- **Blockchain integration**: Ed25519 key operations use the same `cryptography` library that `d31337m3_chain.crypto` uses. The keypair generated at registration is compatible with the chain's node identity scheme.
- **Extensibility**: Two JSONB columns (`enrollment_data`, `extra_fields`) allow adding arbitrary fields without schema changes.
- **Idempotency**: Registration is idempotent-checked (email/username uniqueness). Login is stateless (JWT). Admin updates are idempotent.
- **Security**: Passwords hashed with bcrypt. JWTs signed with HS256. Ed25519 signatures verified with the `cryptography` library. Audit logs capture all auth events.
