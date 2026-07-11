# d31337m3 — Architectural Overview

**d31337m3** ("Delete Me") is a privacy and reputation management SaaS platform. It gives users tooling to monitor, manage, and scrub their personal information from data broker sites across the web. The platform is built as a network of independent microservices, a shared PostgreSQL database, a custom proof-of-authority blockchain, and a distributed crawler network operated by volunteer node operators.

---

## Services

| Service | Port | Role |
|---|---|---|
| **CityHall** | 8000 | User identity, authentication, onboarding, RBAC, blockchain key linkage |
| **Historian** | 8100 | Audit trail and event logging |
| **Lawyer** | 8200 | Legal workflow and compliance operations |
| **Inboxer** | 8300 | Custom SMTP provider, internal staff chat, customer support chat |
| **Director** | 8400 | Microservices orchestrator — health checks, service registry, lifecycle management |
| **Picaso** | 8500 | Frontend UI provider — landing pages, dashboards, brand assets |
| **Spiderwire** | 8600 | Inter-service communication fabric, heartbeat/state sync |
| **Banker** | 8700 | Billing and subscription management (Stripe integration) |
| **Sp1d3r** | 9000 | Core engine — PoA blockchain, distributed crawler, task queue, P2P gossip |

### Frontend

| Path | Purpose |
|---|---|
| `frontends/sp1d3r.d31337m3.com/` | Web interface served by Picaso |

### Node Agent

The **node-agent** is a lightweight Python process deployed in Docker on volunteer operator machines. It authenticates with CityHall, registers as a peer on the Sp1d3r chain, syncs chain state, participates in P2P gossip, and polls for crawl tasks. Each agent maintains its own Ed25519 identity and persistent keypair.

---

## Service Communication

Services communicate over HTTP on localhost. The **Director** acts as the central service registry — each service registers itself on boot and sends periodic heartbeats. **Spiderwire** provides the communication backbone for health checks and state synchronization. **CityHall** is the sole source of user identity and authentication tokens.

P2P communication between Sp1d3r nodes uses signed HTTP requests with Ed25519 challenge-response authentication. Gossip messages are serialized as packed transactions and propagated to all known peers.

```
User/Frontend
      |
  [Picaso] ──── UI
      |
  [CityHall] ──── Auth / Identity
      |
  [Director] ──── Service Registry / Orchestrator
      |
  [Sp1d3r] ───── Chain + Crawler + Task Queue
      |                |
  [Node Agents] ── (Docker, volunteer machines)
```

---

## Deployment Model

**Application services** run under **pm2** on the host. The pm2 ecosystem config is at `microservices/ecosystem.config.js`.

**Infrastructure services** run in Docker:
- **PostgreSQL** — shared database for CityHall (and by extension all services that query user data)
- **Node agents** — deployed per-operator via Dockerfile at `microservices/node-agent/Dockerfile`

There is also a `microservices/docker-compose.yml` that can run all application services in Docker for development, but the production model is pm2 + host PostgreSQL.

---

## Security Model

### Authentication

- **Password auth**: bcrypt-hashed passwords, JWT tokens (HS256, 24h TTL) issued by CityHall
- **Ed25519 key auth**: challenge-response flow — server issues a 32-byte random challenge, client signs it with their Ed25519 private key, server verifies and issues JWT
- **P2P auth**: all inter-node HTTP requests are signed with Ed25519 (`X-Node-Pubkey` + `X-Node-Signature` headers)

### Role-Based Access Control

Roles are additive boolean columns on the `users` table:

| Role | Purpose |
|---|---|
| `is_user` | Base role, set on registration |
| `is_nodeop` | Node operator — can run a crawler node |
| `is_tech_op` | Technical support |
| `is_chat_op` | Chat moderation |
| `is_employee` | Internal staff flag |
| `is_admin` | Full admin access |
| `is_super_admin` | Can promote other admins |

### Blockchain Security

- **Proof-of-Authority** consensus — validator seats limited to hardcoded core infrastructure keys
- Node enrollment tokens issued by admins, stored in `node_enroll_tokens` table
- Binary self-check: nodes hash their own executable and submit an `APP_SIG_VERIFY` transaction; mismatch triggers quarantine
- Plaintext PII guard: any transaction containing raw emails, SSNs, or phone numbers is rejected and the sender is stripped from the authenticated node set

### Node Enrollment

1. Admin creates a node enrollment token via `POST /admin/node-tokens`
2. Volunteer uses the token to register via `POST /admin/node-tokens/use`
3. User is created with `is_nodeop=True`
4. Node agent authenticates, generates an Ed25519 keypair, and registers as a peer on the chain

---

## Source Layout

```
d31337m3/
├── agents.md                          # This file
├── frontends/
│   └── sp1d3r.d31337m3.com/          # Web frontend
└── microservices/
    ├── ecosystem.config.js            # pm2 process config
    ├── docker-compose.yml             # Docker dev stack
    ├── cityhall/                       # Identity & auth (FastAPI + Alembic)
    ├── sp1d3r/                         # Chain + crawler + task queue
    │   ├── app.py                      # HTTP server + API
    │   ├── task_queue.py               # Task state management
    │   └── src/
    │       ├── d31337m3_chain/         # PoA blockchain core
    │       ├── d31337m3_crawler/       # Encrypted crawler worker
    │       └── d31337m3_core/          # Config + orchestrator
    ├── node-agent/                     # Volunteer node agent (Docker)
    ├── director/                       # Service orchestrator
    ├── picaso/                         # Frontend UI
    ├── spiderwire/                     # Communication fabric
    ├── inboxer/                        # SMTP + chat
    ├── banker/                         # Billing (Stripe)
    ├── historian/                      # Audit trail
    └── lawyer/                         # Legal workflow
```
