
# D31337m3 (Pronounced: Delete Me)

**The Decentralized Privacy Management & Crawling Search Platform**

D31337m3 is a decentralized privacy and reputation management platform combining a distributed crawler network with a custom Proof-of-Authority AppChain. Powered by **Sp1d3r** — our decentralized private search engine — it scrapes data from web brokers and search engine indexes with end-to-end encryption, commits cryptographic proofs to an immutable blockchain, and provides identity management, legal document generation, secure messaging, and a full admin/user UI.

> **Status: BETA- Onboarding of active beta testers is now live. Unless your prepared to handle the potential issues that
> can and will arise from trialing beta software, please do not sign up yet and wait for full public launch. With that being said however, we are accepting new users via early access onboarding at https://d31337m3.com/register and use refferal code earlyaccess2026 to get exclusive limited discount subscription (100% off). Discount only valid till august 1st. 

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           d31337m3 SaaS Platform                            │
├────────────┬──────────┬──────────┬────────┬─────────┬──────────┬───────────┤
│  CityHall  │ Director │ Historian│ Lawyer │ Inboxer │  Picaso  │  Sp1d3r   │
│ (8000)     │ (8400)   │ (8100)   │ (8200) │ (8300)  │ (8500)   │ (9000)    │
│  Auth &    │  Orch.   │  SOR     │ Legal  │ Msging  │ UI/UX    │ Chain +   │
│  Onboard   │  Health  │  Store   │  Docs  │  SMTP   │ Delivery │ Crawler   │
├────────────┴──────────┴──────────┴────────┴─────────┴──────────┴───────────┤
│  Banker (8700)           │  Spiderwire (8600)                               │
│  Subscriptions/Payments  │  Networking Fabric                               │
├──────────────────────────┴──────────────────────────────────────────────────┤
│  React Frontend (sp1d3r.d31337m3.com) — Admin + User Dashboard             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Node Agent (Docker) — Remote peer nodes for distributed crawling          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services

All 9 microservices run under **pm2** on the host (not as Docker containers). PostgreSQL runs in a Docker container (`backend-postgres-1`) on port 5432. Node Agents run in Docker containers deployed to user machines.

| Service | Port | Role |
|---------|------|------|
| **CityHall** | 8000 | User auth, RBAC, enrollment, admin CRUD — FastAPI + PostgreSQL |
| **Historian** | 8100 | Encrypted record store, document templates, broker data |
| **Lawyer** | 8200 | Legal document generation from templates with digital signatures |
| **Inboxer** | 8300 | Internal messaging, customer support chat, SMTP email delivery |
| **Director** | 8400 | Service orchestration, health monitoring, remote node tracking |
| **Picaso** | 8500 | Frontend SPA serving, file upload management, traffic reporting |
| **Spiderwire** | 8600 | Networking fabric (placeholder) |
| **Banker** | 8700 | Subscription/payment management (Stripe, Interac e-transfer, crypto) |
| **Sp1d3r** | 9000 | Custom PoA AppChain, crawler engine, task queue, P2P gossip |

Data directories: `/var/lib/sp1d3r/{service}/`

---

## Features

### CityHall — Identity & Access Management

- JWT authentication (HS256) with password and cryptographic key-based login
- RBAC roles: `user`, `nodeop`, `tech_op`, `chat_op`, `admin`, `super_admin`
- Admin user CRUD with search, pagination, and audit logging
- Node operator management with enrollment tokens
- Email verification and rate limiting
- Ed25519 keypair generation for cryptographic authentication

### Sp1d3r — Blockchain & Crawler Engine

- Custom Proof-of-Authority AppChain with compact binary transactions (212 bytes/tx)
- Three transaction types: `NODE_AUTH` (0x01), `APP_SIG_VERIFY` (0x02), `PAYLOAD_COMMIT` (0x03)
- Ed25519 digital signatures with full verification
- Merkle tree for payload root commitment
- PII detection with on-chain alert system
- X25519 + AES-256-GCM end-to-end encryption for crawler payloads
- Binary hash self-check and quarantine enforcement
- P2P gossip protocol, peer store, chain sync from seed
- Task queue for distributed crawling across node agents
- **Encrypted Search Pipeline**: Submit URLs with X25519 public key, results encrypted and stored on chain, only search owner can decrypt

### Director — Service Orchestration

- Service registry (CRUD) with health tracking and heartbeat monitoring
- Automatic restart reconciliation on failure threshold breach
- Remote node tracking for distributed peer nodes
- PM2 log reading and platform health checks
- IP blacklist management

### Banker — Payments & Subscriptions

- Stripe integration for card payments
- Interac e-transfer support
- Cryptocurrency payment verification on-chain
- Subscription tier management
- Auto-free tier for node operators

### Other Services

- **Lawyer**: Fetches templates from Historian, generates legal documents with digital signatures, submits to brokers electronically, prepares escalation documents. Covers jurisdictions across Canada, USA, and Mexico.
- **Inboxer**: SQLite-backed persistent messaging, internal staff chat, 24/7 customer support chat with ticket linking, OTP/2FA email delivery
- **Picaso**: Static SPA serving, file upload management, traffic reporting, built-in nginx, auto SSL via certbot
- **Spiderwire**: Health endpoint, presence detection (placeholder — may be absorbed by other services)
- **Node Agent**: Authenticates with CityHall, registers as peer, sends heartbeats, syncs chain, executes crawl tasks

### Frontend

- React 19 + TypeScript + Vite + MUI v6
- Admin dashboard: user management, service monitoring, node management (live nodes/tasks/peers/blacklist), document management, pricing
- User dashboard: chain status, connected nodes, encrypted search with X25519 E2E encryption

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16 |
| Blockchain | Custom Python — Ed25519, SHA-256, Merkle, PoA |
| Frontend | React 19, TypeScript 6, Vite 8, MUI v6 |
| Crypto | `cryptography` — Ed25519, X25519, AES-256-GCM, HKDF |
| Process | pm2 (all services), Docker (PostgreSQL + node agents only) |

---

## Quick Start

```bash
# Start all services
pm2 start d31337m3/microservices/ecosystem.config.js

# Run database migration
cd d31337m3/microservices/cityhall && PYTHONPATH=. alembic upgrade head

# Build frontend
cd d31337m3/frontends/sp1d3r.d31337m3.com && npm run build

# Run node agent
docker run --rm \
  -e AGENT_USERNAME=xxx -e AGENT_PASSWORD=xxx \
  -e CITYHALL_URL=https://d31337m3.com/cityhall \
  -e SP1D3R_URL=https://d31337m3.com/sp1d3r \
  -e DIRECTOR_URL=https://d31337m3.com/director \
  d31337m3/node-agent
```

**Port Map**: 8000=CityHall, 8100=Historian, 8200=Lawyer, 8300=Inboxer, 8400=Director, 8500=Picaso, 8600=Spiderwire, 8700=Banker, 9000=Sp1d3r

---

<details>
<summary><b>Developer Details</b></summary>

### Service Endpoints

#### CityHall (port 8000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | Password authentication |
| POST | `/auth/logout` | Session invalidation |
| GET | `/auth/challenge` | Cryptographic auth challenge |
| POST | `/auth/authenticate-with-key` | Key-based authentication |
| GET | `/users/me` | Current user profile |
| PUT | `/users/me` | Update profile |
| POST | `/users/me/generate-keypair` | Generate Ed25519 keypair |
| GET | `/users/me/public-key` | Get public key |
| POST | `/users/me/link-wallet` | Link wallet address |
| GET | `/admin/users` | List users (admin) |
| GET | `/admin/users/search` | Search users (admin) |
| GET/PUT/DELETE | `/admin/users/{id}` | User CRUD (admin) |
| POST | `/enrollment/create` | Create enrollment token (admin) |
| POST | `/enrollment/redeem` | Redeem enrollment token |

Swagger docs: `http://localhost:8000/docs`

#### Sp1d3r (port 9000)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/search` | Submit encrypted search (URLs + X25519 pubkey) |
| GET | `/v1/search/{id}` | Get search status/results (owner-only) |
| GET | `/v1/searches` | List user's searches (filtered by pubkey) |
| POST | `/v1/crawl` | Submit crawl URLs (returns task ID) |
| GET | `/v1/chain/state` | Get chain state |
| GET | `/v1/chain/peers` | List connected peers |
| POST | `/v1/chain/peers` | Register new peer |
| GET | `/v1/tasks/pending` | Poll for pending tasks |
| POST | `/v1/tasks/create` | Create new task |
| POST | `/v1/tasks/result` | Submit task results |
| GET | `/v1/tasks/{id}` | Get task details |

#### Director (port 8400)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + service count |
| GET | `/services` | List all registered services |
| GET | `/services/{name}` | Get service details |
| POST | `/services` | Register/update service |
| POST | `/services/{name}/heartbeat` | Service heartbeat |
| POST | `/services/{name}/health` | Report health status |
| POST | `/services/{name}/alert` | Raise alert |
| GET | `/alerts` | Service alerts |
| GET | `/traffic/frontend` | Frontend traffic stats |
| POST | `/traffic/frontend` | Report traffic |
| POST | `/reconcile` | Auto-restart unhealthy services |
| GET | `/nodes` | List remote nodes |
| GET | `/blacklist` | IP blacklist |
| POST | `/blacklist` | Add IP to blacklist |

#### Historian (port 8100)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/records/{key}` | Get encrypted record |
| POST | `/records` | Store encrypted record |
| GET | `/templates/{name}` | Get document template |
| POST | `/templates` | Store template |
| GET | `/brokers/{name}` | Get broker data rows |
| POST | `/broker-import` | Import broker data |

#### Lawyer (port 8200)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/documents/generate` | Generate document from template |
| GET | `/documents/{id}` | Retrieve generated document |
| POST | `/documents/{id}/submit` | Submit document to broker |

#### Inboxer (port 8300)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/messages` | List messages (optional `?channel=` filter) |
| POST | `/messages` | Send message |
| POST | `/mail` | Send SMTP email |

#### Banker (port 8700)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/subscriptions` | List subscription tiers |
| POST | `/subscriptions/create` | Create subscription |
| POST | `/payments/stripe` | Process Stripe payment |
| POST | `/payments/interac` | Process Interac e-transfer |
| POST | `/payments/crypto` | Verify crypto payment on-chain |

#### Picaso (port 8500)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + restart/failure stats |
| GET | `/` or `/frontends` | List frontends |
| GET | `/frontends/{path}` | Serve static file |
| POST | `/uploads` | Upload frontend file |
| POST | `/health/report` | Health report (triggers auto-restart) |
| POST | `/restart` | Restart service |

#### Spiderwire (port 8600)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/presence` | Record presence |

### Environment Variables

| Variable | Default | Service |
|----------|---------|---------|
| `CITYHALL_PORT` | `8000` | CityHall |
| `CITYHALL_DATABASE_URL` | `postgresql+asyncpg://cityhall:cityhall@localhost:5432/cityhall` | CityHall |
| `CITYHALL_JWT_SECRET_KEY` | `cityhall-dev-secret-key-change-in-production` | CityHall |
| `HISTORIAN_PORT` | `8100` | Historian |
| `HISTORIAN_DATA_DIR` | `/var/lib/sp1d3r/historian` | Historian |
| `HISTORIAN_ENCRYPTION_KEY` | `dev-only-key` | Historian |
| `LAWYER_PORT` | `8200` | Lawyer |
| `HISTORIAN_URL` | `http://127.0.0.1:8100` | Lawyer |
| `INBOXER_PORT` | `8300` | Inboxer |
| `INBOXER_DATA_DIR` | `/var/lib/sp1d3r/inboxer` | Inboxer |
| `INBOXER_SMTP_HOST` | `localhost` | Inboxer |
| `INBOXER_SMTP_PORT` | `25` | Inboxer |
| `INBOXER_SMTP_FROM` | `support@d31337m3.com` | Inboxer |
| `DIRECTOR_PORT` | `8400` | Director |
| `DIRECTOR_DATA_DIR` | `/var/lib/sp1d3r/director` | Director |
| `DIRECTOR_RESTART_THRESHOLD` | `2` | Director |
| `PICASO_PORT` | `8500` | Picaso |
| `PICASO_DATA_DIR` | `/var/lib/sp1d3r/picaso` | Picaso |
| `PICASO_RESTART_THRESHOLD` | `2` | Picaso |
| `SPIDERWIRE_PORT` | `8600` | Spiderwire |
| `BANKER_PORT` | `8700` | Banker |
| `SP1D3R_PORT` | `9000` | Sp1d3r |
| `SP1D3R_HOST` | `0.0.0.0` | Sp1d3r |
| `DIRECTOR_URL` | `http://127.0.0.1:8400` | Picaso, Sp1d3r, Spiderwire |
| `SP1D3R_URL` | `http://127.0.0.1:9000` | Node Agent |

### Project Structure

```
d31337m3/
├── frontends/
│   └── sp1d3r.d31337m3.com/          React 19 + TypeScript + Vite + MUI v6
├── microservices/
│   ├── ecosystem.config.js            pm2 process configuration
│   ├── cityhall/                      FastAPI + PostgreSQL auth service
│   │   ├── app/
│   │   │   ├── main.py               FastAPI app entry
│   │   │   ├── config.py             Settings & env vars
│   │   │   ├── database.py           SQLAlchemy async engine
│   │   │   ├── models.py             ORM models
│   │   │   ├── schemas.py            Pydantic schemas
│   │   │   ├── auth.py               JWT & key auth logic
│   │   │   └── routers/              auth.py, users.py, admin.py
│   │   ├── migrations/                Alembic
│   │   └── docker-compose.yml         PostgreSQL container
│   ├── sp1d3r/                        Blockchain + crawler
│   │   ├── src/d31337m3_chain/       chain.py, transaction.py, crypto.py, merkle.py, pii_guard.py
│   │   ├── src/d31337m3_crawler/     worker.py, self_check.py
│   │   ├── src/d31337m3_core/        config.py, orchestrator.py
│   │   └── tests/                    Blockchain unit tests
│   ├── director/                      Service orchestration & health
│   ├── historian/                     Encrypted record store
│   ├── lawyer/                        Legal document generation
│   ├── inboxer/                       Messaging + SMTP
│   ├── picaso/                        UI delivery & file management
│   ├── banker/                        Payments & subscriptions
│   └── spiderwire/                    Networking fabric (placeholder)
├── node-agent/                        Lightweight Python peer agent
│   ├── Dockerfile
│   └── agent.py                       CityHall auth, heartbeats, task execution
└── agents.md                          Service overview docs
```

### Testing

```bash
# Sp1d3r blockchain engine tests
cd d31337m3/microservices/sp1d3r
python -m unittest discover -s tests

# CityHall — browse API docs at http://localhost:8000/docs

# Frontend type check
cd d31337m3/frontends/sp1d3r.d31337m3.com
npm run typecheck
```

</details>
