# Historian - System-of-Record & Data Access Control Plane

The single gate for all persistent data on the platform. No other service writes directly to storage -- everything flows through Historian.

**Port:** 8100 (via pm2)

## Features

- **Encrypted-at-rest JSON store** - all persisted record values are encrypted before writing to disk
- **Service-separated records** - data stored under namespaced keys, accessible only via the API
- **Template management** - CRUD for document templates used by Lawyer and other services
- **Broker data management** - store and retrieve broker metadata rows
- **CSV import ingestion** - bulk import broker update rows via structured payloads
- **CORS enabled** - full cross-origin support for frontend integrations

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| POST | `/records` | Store a record (body: `{key, value}`) |
| GET | `/records/:key` | Retrieve and decrypt a stored record |
| POST | `/templates` | Create or update a template (body: `{name, body}`) |
| GET | `/templates` | List all template names and count |
| GET | `/templates/:name` | Retrieve a specific template body |
| DELETE | `/templates/:name` | Delete a template |
| POST | `/broker-import` | Bulk import broker rows (body: `{broker_name, rows}`) |
| GET | `/brokers/:name` | Retrieve stored broker metadata |

## Data Layout

- **records** - arbitrary key/value pairs, values encrypted at rest (hex encoding)
- **templates** - named document body templates (plain text with `{placeholder}` markers)
- **brokers** - broker name mapped to array of metadata row objects

Storage path: `$HISTORIAN_DATA_DIR/records.json` (default `/tmp/historian-data/records.json`)
