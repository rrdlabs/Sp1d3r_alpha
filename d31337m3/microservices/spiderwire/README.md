# SpiderWire - Networking & Communication Fabric

Networking and communication fabric for the d31337m3 platform. Intended to handle health/presence detection, anti-DDoS, and firewalling across the mesh.

**Port:** 8600 (via pm2)

## Features

- **Health endpoint** - basic liveness check
- **Presence detection** - record and track node presence in the network
- **CORS enabled** - full cross-origin support

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| POST | `/presence` | Record a node's presence (body: arbitrary JSON) |

## Status

This service is currently a placeholder. Planned capabilities:

- Health and presence detection for all mesh nodes
- Anti-DDoS rate limiting and traffic filtering
- Firewall rule management and IP blocking
- Network topology tracking
