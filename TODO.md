# TODO — Remaining Actionable Items

## Node Agent & Infrastructure

- [ ] Build node-agent Docker image and push to registry
- [x] Implement rate limiting per-node-agent
- [x] Add CI/CD pipeline (GitHub Actions) — `.github/workflows/ci.yml`
- [x] Build node operator dashboard (user-facing node stats)
- [x] Add automated node health alerts

## P2P Network Hardening

- [ ] Add WebSocket support for real-time task push (instead of polling) — needs ws library
- [ ] Implement P2P encrypted transport (X25519+AES-256-GCM for responses)
- [x] Add peer exchange (PEX) for wider network discovery
- [ ] Implement node reputation/scoring system

## Crawler & Task Routing

- [x] Add crawl task priority and scheduling
- [ ] Add geolocation-based task routing

## Chain Management

- [x] Implement chain pruning for old blocks

## Documentation & UX

- [x] Add comprehensive API documentation (OpenAPI/Swagger)
- [x] Build mobile-responsive admin dashboard

## Docker

- [x] Enable `docker compose up --build` for all services to work without errors

---

## Completed in v0.10.0+

| Item | Commit | Details |
|------|--------|---------|
| Rate limiting per-node-agent | (this commit) | `_NodeRateLimiter` in sp1d3r/app.py, 120 req/min per pubkey |
| CI/CD GitHub Actions | (this commit) | `.github/workflows/ci.yml` — chain tests, frontend builds, migration check |
| Node operator dashboard | (this commit) | `NodeDashboard.tsx` in desktop + mobile frontends, `/dashboard/nodes` route |
| Node health alerts | (this commit) | Director reconcile checks nodes offline >72h, adds warning alerts |
| PEX (peer exchange) | (this commit) | `POST /v1/chain/pex` endpoint, gossip worker exchanges peers during heartbeat |
| Task priority | (this commit) | `priority` field in Task dataclass, `assign_next` sorts by priority then age |
| Chain pruning | (this commit) | `POST /v1/chain/prune` endpoint, `AppChain.prune()` keeps N most recent blocks |
| API documentation | (this commit) | `sp1d3r/openapi.yaml` — OpenAPI 3.0 spec for all Sp1d3r endpoints |
| Docker compose fix | (this commit) | Added `postgres` + `cityhall` services with healthcheck and proper dependencies |
