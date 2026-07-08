# Short-Term Roadmap — Items Needing 3rd-Party Deps / More Work

| Item | Dependency / Reason |
|------|-------------------|
| CI/CD pipeline (GitHub Actions) | Needs runner config, secret provisioning |
| Infisical secrets management integration | 3rd-party service integration |
| Kubernetes manifests | Needs k8s cluster, container registry |
| OAuth2/OIDC federation (CityHall) | Needs 3rd-party provider setup (Google, GitHub, etc.) |
| MFA / 2FA (CityHall) | Needs TOTP lib, SMS/email OTP delivery integration |
| Real P2P/gossip networking fabric (Spiderwire) | Significant distributed systems work — may absorb into other services |
| Bluetooth transport | Specialized hardware/protocol; unclear priority |
| Anti-fingerprinting wrapper for crawler | Complex browser automation / proxy rotation infra |
| Async gateway for task routing (crawler) | Needs message broker (Redis/RabbitMQ/NATS) |
| Volunteer node protocol | Distributed systems design + p2p networking |
| Distributed task queue | Needs message broker + worker pool orchestration |
| Multi-region deployment | Needs cloud provider + DNS/CDN + DB replication |
| User/admin-facing React frontend apps | Large frontend build-out; needs design + routing + state management |
| TypeScript strict mode | Many type errors to resolve across frontend |
| Python type coverage (mypy) | Many services, gradual typing effort |
