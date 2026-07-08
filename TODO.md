# TODO — Single-Pass Actionable Items

## ✅ Completed

- [x] Add `node_modules` / `dist` to `.gitignore` (root + frontend)
- [x] Deduplicate Sp1d3r source — no duplicate exists in workspace
- [x] Wire `POST /v1/crawl` stub to actually invoke the real crawler engine (`d31337m3_crawler/worker.py`)
- [x] Persist chain state to disk (currently in-memory only — `chain.py`)
- [x] Persist crawler findings to durable encrypted ciphertext storage (currently in-memory only)
- [x] CityHall: add automated unit tests with `TestClient` (FastAPI) — 10 tests passing
- [x] CityHall: add rate limiting (configurable middleware)
- [x] CityHall: implement email verification flow
- [x] Sp1d3r: implement chain CLI entry point for self-check
- [x] Sp1d3r: implement PII detection alerting
- [x] Add missing `requirements.txt` for historian and lawyer (Docker builds)

## 🔲 Remaining

- [ ] Enable `docker compose up --build` for all 7 services to work without errors
