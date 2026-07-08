# d31337m3 AppChain & Crawler Network (SP1D3R)

Initial Python implementation scaffold for SP1D3R the AppChain, safe crawler worker, and core orchestrator.

This repository intentionally avoids implementing PII scraping, browser anti-fingerprinting, or network evasion behavior. The crawler worker accepts local caller-provided payloads, encrypts them before storage, and commits only hashes and Merkle roots to the chain.

## Layout

- `src/d31337m3_chain`: transaction packing, Ed25519 verification, PoA-style state machine.
- `src/d31337m3_crawler`: startup self-check and encrypted local payload processing.
- `src/d31337m3_core`: orchestrator config parsing and atomic writes.
- `tests`: compile-time and behavior tests for the first implementation slice.

## Verify

```powershell
python -m compileall src tests
python -m unittest discover -s tests
```
