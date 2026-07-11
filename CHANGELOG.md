# Changelog

All notable changes to this project are documented per service below.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## 2026-07-11

### Project
- **Docker to pm2 migration**: All 9 microservices now run under pm2 instead of Docker containers. Data migrated to /var/lib/sp1d3r/{service}/. pm2 save for boot persistence.
- **Nginx proxy**: All 9 services proxied through nginx at d31337m3.com with SSL + SPA fallback.
- **Super admin**: Created and promoted (admin/Kronik4life!!2026!!).

### sp1d3r (v0.4.0 → v0.5.0)
- **Encrypted Search Pipeline**: End-to-end encrypted search with X25519 key agreement.
  - `POST /v1/search`: Submit URLs with X25519 public key. Creates crawl tasks, encrypts results with recipient's key.
  - `GET /v1/search/{id}`: Retrieve search status and encrypted results (owner-only via `X-Requester-Pubkey` header).
  - `GET /v1/searches`: List user's searches filtered by public key.
  - **Owner-only access**: 403 blocked if requester's pubkey doesn't match search owner.
  - **SearchStore**: File-based search tracking with status (pending/crawling/completed), task IDs, encrypted results, and failure tracking.
  - **Encrypted results**: Each result includes `ephemeral_public_key`, `nonce`, and `ciphertext` for client-side decryption.
- **Task completion enhancements**: Results now include ephemeral keys and ciphertext for client-side decryption.

### cityhall (v0.2.0 → v0.3.0)
- **Suspend/unsuspend users**: POST /admin/users/{id}/suspend, POST /admin/users/{id}/unsuspend with reason.
- **Node operator management**: POST /admin/users/{id}/set-nodeop, POST /admin/users/{id}/remove-nodeop, GET /admin/node-operators.
- **Node enrollment tokens**: NodeEnrollToken model + POST /admin/node-tokens (create), GET /admin/node-tokens (list), POST /admin/node-tokens/{id}/revoke, POST /admin/node-tokens/use (public enrollment endpoint).
- **Internal node check**: GET /internal/node-check?user_id=X for cross-service nodeop verification.
- **Migration 003**: Added is_suspended + suspended_reason columns.
- **Migration 004**: Created node_enroll_tokens table.

### sp1d3r (v0.3.0 → v0.4.0)
- **Task queue**: File-based task queue (task_queue.py) with create/assign/complete lifecycle. Tasks stored in tasks.json.
- **Task endpoints**: GET /v1/tasks (list), POST /v1/tasks/create (admin creates crawl tasks), GET /v1/tasks/{id} (details), GET /v1/tasks/pending (agent polls), POST /v1/tasks/result (agent submits results).
- **Enhanced sync endpoint**: GET /v1/chain/sync now returns height + tip_hash for proper chain state.
- **Enhanced peers endpoint**: POST /v1/chain/peers now accepts JWT auth headers.
- **Task execution**: POST /v1/tasks/result now performs actual crawl - fetches URLs, encrypts payloads with recipient key, commits to chain, saves findings.

### director (v0.1.0 → v0.2.0)
- **Remote node tracking**: POST /services/{name}/heartbeat now stores pubkey, height, version fields.
- **Nodes endpoint**: GET /nodes lists all connected node agents with status/height/version.
- **PM2 log reading**: /logs/{name} reads from ~/.pm2/logs/ instead of Docker socket.
- **Service restart/stop**: POST /services/{name}/restart, POST /services/{name}/stop (now via pm2).

### node-agent (v0.1.0-beta) — NEW
- **Lightweight Python agent**: Single-file service (~300 lines) for user-hosted peer nodes.
- **CityHall authentication**: JWT-based auth with username/password or pre-authenticated token.
- **Peer registration**: Registers as peer on sp1d3r chain with ed25519 keypair.
- **Heartbeat loop**: Sends periodic heartbeats to director with pubkey/height/version.
- **Chain sync**: Polls chain state and tracks height.
- **Crawl task execution**: Fetches URLs, submits content hashes to sp1d3r for encryption and chain commit.
- **Docker image**: Dockerfile for easy deployment (~50MB image).
- **Persistent keypair**: Ed25519 keypair stored in /data/node_key.seed.

### banker
- **Node operator support**: GET /node-check, GET /subscription-status for nodeop verification.
- **Auto-free tier**: Node operators automatically get free active Professional subscription.
- **Crypto verification**: On-chain tx validation via RPC (checks recipient, ERC20 transfer event, amount, tx status).
- **Auto-suspend**: 3 failed crypto verification attempts → auto-suspend account.

### frontend
- **Encrypted Search Panel**: New SearchPanel component with X25519 keypair generation, encrypted search, real-time polling, and client-side decryption.
- **X25519 Crypto Utilities**: Web Crypto API-based keypair generation, storage in localStorage, and ECDH + HKDF-SHA256 + AES-256-GCM decryption.
- **Search History**: View past searches with status, results count, and decrypt-on-demand capability.
- **Admin NodeManagement**: 5 tabs - Live Nodes (from director), Node Operators, Peers, Tasks (with create dialog), IP Blacklist.
- **Admin ServiceMonitor**: Restart/kill buttons per service.
- **Admin Documents**: Template CRUD (create/preview/edit/delete via historian+lawyer).
- **User Dashboard**: Chain status cards, connected nodes table, crawl runner.
- **SubscriptionOnboarding**: Nodeop detection (auto free pro), crypto tx verification, Interac confirmation.
- **Layout update**: Node Management replaces Network tab, Documents added.

---

## 2026-07-08

### sp1d3r (v0.1.0 → v0.2.0)
- **Chain persistence**: `AppChain` now persists state to a JSON file on disk after every mutation, survives restarts.
- **Crawl wiring**: `POST /v1/crawl` now invokes real HTTP fetches, encrypts findings, commits payload hashes to chain, and stores ciphertext via `FindingStore`.
- **Durable ciphertext storage**: New `FindingStore` class saves encrypted findings to disk as JSON files keyed by payload hash.
- **CLI entry point**: `python -m d31337m3_chain` with `--info`, `--check-binary`, `--state`, `--identity` flags for self-check and introspection.
- **PII alerting**: `AppChain.alert_pii_detected()` method and event generation for detected PII in crawler output.
- **Dockerfile**: Added `PYTHONPATH=/app/src` for package resolution.
- **Health endpoint**: Now reports chain_blocks, authenticated_nodes, payload_roots, and findings_stored counts.
- Added `GET /v1/chain/state` endpoint for chain introspection.

### sp1d3r (v0.2.0 → v0.3.0)
- **P2P authentication**: Added `sign_request()`/`verify_signed_request()` helpers for Ed25519-signed HTTP headers (`X-Node-Pubkey`, `X-Node-Signature`).
- **Peer store**: New `PeerStore` class persists known peers to `peers.json` with `add()`, `remove()`, `list()`, `prune_stale()`, `mark_seen()`, and `get_by_pubkey()`.
- **Gossip manager**: `GossipWorker` background thread broadcasts new transactions to all known peers with heartbeat/ping for liveness. Stale peers (>3 missed pings) auto-removed.
- **Block sync endpoints**:
  - `GET /v1/chain/blocks?since=<height>` — returns packed transactions from height+1 to tip, Ed25519-signed response.
  - `GET /v1/chain/snapshot` — returns full chain state snapshot (genesis hash, height, authenticated nodes, approved hashes, payload roots) with signed response.
  - `GET /v1/chain/peers` — lists known peers.
  - `POST /v1/chain/peers` — registers a new peer (url + pubkey).
  - `GET /v1/chain/ping` — lightweight heartbeat returning height and timestamp.
  - `GET /v1/chain/sync` — returns sync status.
  - `POST /v1/chain/gossip` — receives incoming transaction gossip, validates and commits locally.
- **Chain import**: `AppChain.import_blocks(packed_transactions)` validates signatures + chain linkage, replays transactions in batch mode, rejects bad blocks.
- **Sync-on-boot**: `SP1D3R_SEED_NODE` env var triggers fetch-snapshot → fetch-blocks → import on startup. Verifies chain_id and genesis hash before importing.
- **Chain extensions**:
  - `AppChain.height` property.
  - `AppChain.blocks_since(height)` returns packed transactions.
  - `AppChain.export_snapshot()` returns full state dict.
  - `AppChain.raw_transactions` stores packed tx bytes for peer sync.
  - `AppChain.on_commit()` callback for real-time gossip hooks.
  - `GENESIS_PREV_HASH` constant for chain validation.
  - `_batch_mode` flag to suppress per-transaction saves during bulk import.
- **Unit tests**: 30 new tests covering P2P auth, peer store CRUD/persistence/pruning, block import (empty/single/multiple/continuing/critical-error/bad-sig/bad-size), blocks_since, snapshot export, gossip dedup, and full export-import roundtrip.

### cityhall (v0.1.0 → v0.2.0)
- **Rate limiting**: Added `RateLimitMiddleware` with configurable max_requests/window_seconds. Disabled via `CITYHALL_RATE_LIMIT_ENABLED=false`.
- **Email verification**: Added `email_verified` and `email_verification_token` columns to User model.
  - Added `POST /auth/verify-email` and `POST /auth/confirm-email` endpoints.
  - Added Alembic migration `002_add_email_verification.py`.
- **Unit tests**: 10 tests covering health, registration, login, duplicate detection, password mismatch, and email verification flow.
  - Uses SQLite (`aiosqlite`) test database with FastAPI `TestClient` via `httpx.ASGITransport`.
  - Test configuration with `pyproject.toml` (`asyncio_mode = auto`).
- **Model compatibility**: Switched `JSONB` to generic `JSON` type for cross-backend test compatibility.
- **Dependencies**: Added pytest, pytest-asyncio, httpx, aiosqlite. Pinned bcrypt for passlib compatibility.

### historian (v0.1.0)
- Added missing `requirements.txt` to fix Docker build.

### lawyer (v0.1.0)
- Added missing `requirements.txt` to fix Docker build.

### Project
- Fixed root `.gitignore` (corrupted backtick-n sequences → proper line breaks, added `node_modules/`, `dist-ssr/`, `__pycache__/`, `*.pyc`, `.env`, `.vscode/`).
- Removed TODO item about deduplicating `/Sp1d3r` (already resolved — duplicate does not exist in workspace).
- Created `CHANGELOG.md` with per-service version tracking.
