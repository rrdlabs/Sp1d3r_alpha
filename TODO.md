# TODO — Remaining Actionable Items

## Node Agent & Infrastructure

- [ ] Build node-agent Docker image and push to registry
- [ ] Implement rate limiting per-node-agent
- [ ] Add CI/CD pipeline (GitHub Actions) — needs runner config
- [ ] Build node operator dashboard (user-facing node stats)
- [ ] Add automated node health alerts

## P2P Network Hardening

- [ ] Add WebSocket support for real-time task push (instead of polling) — needs ws library
- [ ] Implement P2P encrypted transport (X25519+AES-256-GCM for responses)
- [ ] Add peer exchange (PEX) for wider network discovery
- [ ] Implement node reputation/scoring system

## Crawler & Task Routing

- [ ] Add crawl task priority and scheduling
- [ ] Add geolocation-based task routing

## Chain Management

- [ ] Implement chain pruning for old blocks

## Documentation & UX

- [ ] Add comprehensive API documentation (OpenAPI/Swagger)
- [ ] Build mobile-responsive admin dashboard

## Docker

- [ ] Enable `docker compose up --build` for all 7 services to work without errors
