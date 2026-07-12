# SP1D3R - Decentralized Private Search Engine

The decentralized search engine powering the D31337m3 platform. Custom Proof-of-Authority AppChain with an integrated crawler, task queue, encrypted search pipeline, and P2P gossip network.

**Port:** 9000 (via pm2)

## Features

- **212-byte fixed transaction format** with compact binary packing
- **3 transaction types:** data commit, metadata, and control
- **Ed25519 signatures** for transaction signing and chain verification
- **Merkle trees** for block integrity proofs
- **PII detection** via `pii_guard` to scrub sensitive data before chain commit
- **X25519 + AES-256-GCM encryption** for payload confidentiality
- **P2P gossip protocol** for peer-to-peer block and transaction propagation
- **Peer store** tracking known nodes and their chain state
- **Chain sync** to catch up with the network on startup
- **Task queue** for distributing crawl jobs across worker nodes
- **Encrypted Search Pipeline** - X25519 E2E encrypted search with client-side decryption
- **Crawler worker** with startup self-check and encrypted local payload processing

## Source Layout

```
src/
  d31337m3_chain/          # AppChain core
    chain.py               # Block storage, validation, PoA state machine
    transaction.py         # 212-byte tx format, packing/unpacking
    crypto.py              # Ed25519 key generation, signing, verification
    merkle.py              # Merkle tree construction and proof
    pii_guard.py           # PII detection and scrubbing
    p2p.py                 # Gossip protocol, peer discovery, block propagation
    __main__.py            # Chain entrypoint
  d31337m3_core/           # Orchestrator and config
    config.py              # Config parsing, env vars, defaults
    orchestrator.py        # Service orchestration, atomic writes
    api.py                 # HTTP API layer
    gateway.py             # Gateway routing
  d31337m3_crawler/        # Crawler subsystem
    worker.py              # Crawl worker, payload processing
    self_check.py          # Startup health and capability verification
app.py                     # HTTP server entrypoint (port 9000)
task_queue.py              # In-memory task queue for distributed job dispatch
search_store.py           # Encrypted search tracking and storage
```

## Key Endpoints

### Search Endpoints (Encrypted E2E)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/search` | JWT required | Submit encrypted search (URLs + X25519 public key). Gated by subscription/trial status. |
| GET | `/v1/search/{id}` | `X-Requester-Pubkey` | Get search status/results (owner-only) |
| GET | `/v1/searches` | `X-Requester-Pubkey` | List user's searches (filtered by public key) |

**Search Authorization:**
- `POST /v1/search` requires `Authorization: Bearer <jwt>` header.
- Backend verifies JWT via CityHall, checks: active subscription → node operator → trial availability.
- Trial users get 1 search/day for 7 days (7 total). After exhaustion, returns 403 with redirect to `/paywall`.

**Search Flow:**
1. User generates X25519 keypair in browser (or loads from localStorage)
2. Public key sent with search request to `POST /v1/search`
3. Server creates crawl tasks, fetches URLs, encrypts results with X25519 ECDH + HKDF-SHA256 + AES-256-GCM
4. Encrypted results include `ephemeral_public_key`, `nonce`, and `ciphertext`
5. User retrieves encrypted results via `GET /v1/search/{id}` (owner-only)
6. Browser decrypts using its private key - only the search owner can read results

### Chain Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/v1/chain/state` | Get chain state |
| GET | `/v1/chain/snapshot` | Get full chain snapshot |
| GET | `/v1/chain/blocks?since=<height>` | Get blocks since height |
| GET | `/v1/chain/peers` | List known peers |
| POST | `/v1/chain/peers` | Register new peer |
| GET | `/v1/chain/ping` | Peer heartbeat |
| GET | `/v1/chain/sync` | Get sync status |
| POST | `/v1/chain/gossip` | Receive transaction gossip |

### Task Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/tasks` | List tasks (optional `?status=` filter) |
| POST | `/v1/tasks/create` | Create new task (admin) |
| GET | `/v1/tasks/{id}` | Get task details |
| GET | `/v1/tasks/pending` | Poll for pending tasks (agent) |
| POST | `/v1/tasks/result` | Submit task results (agent) |

## Running Tests

```bash
python -m compileall src tests
python -m unittest discover -s tests
```

## Test Files

- `tests/test_chain.py` - Chain creation, block append, tx validation
- `tests/test_chain_p2p.py` - P2P gossip, peer store, chain sync
- `tests/test_worker_and_config.py` - Crawler worker, config parsing, orchestrator
