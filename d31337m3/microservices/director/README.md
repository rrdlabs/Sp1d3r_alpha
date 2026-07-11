# Director - Service Orchestration & Health Control

Central orchestration service for the d31337m3 platform. Tracks all registered services, monitors health via heartbeats, reads PM2 logs, and provides platform-wide visibility.

**Port:** 8400 (via pm2)

## Features

- **Service registry** - register, update, and query running services
- **Heartbeat monitoring** - services POST heartbeats to report status, reset failure counts
- **Failure tracking and reconciliation** - auto-flag services that exceed failure thresholds
- **PM2 log reading** - reads stdout/stderr logs from `~/.pm2/logs/` for all registered services
- **Platform health checks** - probes every service's `/health` endpoint and returns aggregate status
- **IP blacklist management** - add/remove/block IPs, shared with node agents
- **Remote node agent tracking** - filter registered services by `kind=node` or `node-agent` prefix
- **Traffic tracking** - record frontend request counts and path distributions
- **Container control** - restart and stop containers via Docker socket

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Director health and registered service count |
| GET | `/services` | List all registered services |
| GET | `/services/:name` | Get a single service's state |
| POST | `/services` | Register or update a service |
| POST | `/services/:name/heartbeat` | Report heartbeat (resets failure count) |
| POST | `/services/:name/health` | Report health status (increments on failure) |
| POST | `/services/:name/alert` | Record an alert for a service |
| GET | `/services/:name/restart` | Restart a service container |
| GET | `/services/:name/stop` | Stop a service container |
| GET | `/platform-health` | Probe all services and return aggregate status |
| GET | `/logs/:service?lines=N` | Read PM2 logs for a service (default 50, max 500) |
| GET | `/traffic/frontend` | View frontend traffic stats |
| POST | `/traffic/frontend` | Record a frontend request |
| POST | `/reconcile` | Auto-restart services that exceed failure threshold |
| GET | `/blacklist` | List blacklisted IPs |
| POST | `/blacklist` | Add an IP to the blacklist |
| DELETE | `/blacklist/:id` | Remove an IP from the blacklist |
| GET | `/nodes` | List all registered remote node agents |
| GET | `/alerts` | List all recorded alerts |

## Monitored Services

cityhall, historian, lawyer, inboxer, director, picaso, spiderwire, sp1d3r, banker
