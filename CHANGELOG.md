# Changelog

All notable changes to this project are documented per service below.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
