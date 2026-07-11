# Picaso - UI Delivery Service

Frontend static serving and asset management for the d31337m3 platform. Handles file uploads, serves frontend assets, and reports traffic to Director.

**Port:** 8500 (via pm2)

## Features

- **Static file serving** - serves uploaded frontend assets from `$PICASO_DATA_DIR/frontends/`
- **File upload** - accepts both JSON and multipart/form-data uploads for frontend deployment
- **Traffic reporting** - reports request counts and paths to Director for analytics
- **Health reporting** - self-monitoring with restart threshold and failure tracking
- **Director registration** - auto-registers with Director on startup as a `frontend` service

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health with restart/failure counts |
| GET | `/` | List all uploaded frontend files |
| GET | `/frontends` | List all uploaded frontend files |
| GET | `/frontends/:path` | Serve a specific frontend asset |
| POST | `/uploads` | Upload a frontend file (JSON or multipart/form-data) |
| POST | `/health/report` | Self-report health status |
| POST | `/restart` | Trigger a self-restart |

## Storage

Frontend assets are stored under `$PICASO_DATA_DIR/frontends/` (default `/tmp/picaso-data/frontends/`).
