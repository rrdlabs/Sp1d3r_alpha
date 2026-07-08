# d31337m3 AppChain & Crawler Network (SP1D3R) Todo

## Working Rules

- Log all tasks, errors, exceptions, and verification results here.
- Keep changes aligned with `agents.md`.
- Build compile-ready components and verify them before marking tasks done.
- Do not implement PII scraping, credential collection, browser anti-fingerprinting evasion, or raw PII transfer paths. Implement privacy-preserving local processing and encrypted payload handling instead.

## Phase 1 - AppChain State Machine

- [x] Add explicit transaction header byte packing/unpacking and Ed25519 signature verification.
- [x] Add PoA-style authenticated node registry.
- [x] Add approved application hash registry and quarantine event on mismatch.
- [x] Add hash-only payload commit tracking with Merkle root storage.
- [x] Add plaintext PII guard for transaction pipeline rejection.

## Phase 2 - Safe Crawler Worker

- [x] Add concurrent worker pool for caller-provided local payloads.
- [x] Add X25519 plus AES-GCM encryption before payload commit.
- [x] Reject payloads that look like plaintext PII before processing.
- [ ] Add durable encrypted ciphertext storage backend.

## Phase 3 - Binary Signature Self-Check

- [x] Add executable hash calculation and AppSigVerify startup handshake.
- [ ] Add CLI entrypoint that runs self-check before worker startup.

## Phase 4 - Core Orchestrator

- [x] Add default `config.toml` serializer.
- [x] Add atomic config write with flush and `fsync()`.
- [ ] Add async gateway API for task routing.

## Verification Log

- 2026-07-07: `go` unavailable in PATH; Go/Rust compile targets could not be used in this workspace.
- 2026-07-07: Python 3.11 available; `cryptography` 46.0.5 available.
- 2026-07-07: Added Python scaffold for chain, crawler worker, and orchestrator.
- 2026-07-07: `python -m compileall src tests` passed.
- 2026-07-07: `python -m unittest discover -s tests` initially failed on Windows directory `fsync()` with `PermissionError`; patched atomic writer to skip directory fsync where the OS denies directory handles after successfully fsyncing the file.
- 2026-07-07: `python -m compileall src tests` passed after patch.
- 2026-07-07: `python -m unittest discover -s tests` passed: 6 tests OK.
