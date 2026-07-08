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
