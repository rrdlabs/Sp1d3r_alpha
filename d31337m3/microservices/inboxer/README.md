# Inboxer - Communications Layer

Platform communications service handling support chat, staff messaging, and outbound SMTP email. SQLite-backed for persistence, with configurable mail relay support.

**Port:** 8300 (via pm2)

## Features

- **SQLite-backed message store** - channels for support chat and staff messaging
- **Outbound SMTP** - sends email via configurable relay, falls back to queue on failure
- **Mail history** - tracks all outbound messages with status (sent/queued)
- **Configurable SMTP settings** - host, port, credentials, and from-address managed via API
- **Channel-based messaging** - filter messages by channel name
- **CORS enabled** - full cross-origin support

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| POST | `/messages` | Store a chat message (body: `{channel, sender, recipient, body, metadata}`) |
| GET | `/messages?channel=X` | List messages, optionally filtered by channel |
| POST | `/mail` | Send outbound email (body: `{to_address, subject, body}`) |
| GET | `/mail/history` | View last 50 outbound mail records |
| GET | `/settings` | View current SMTP settings |
| POST | `/settings` | Update SMTP settings |

## SMTP Configuration

Settings can be provided via environment variables or updated at runtime:

| Variable | Default | Description |
|----------|---------|-------------|
| `INBOXER_SMTP_HOST` | `localhost` | SMTP server hostname |
| `INBOXER_SMTP_PORT` | `25` | SMTP server port |
| `INBOXER_SMTP_USERNAME` | _(empty)_ | SMTP auth username |
| `INBOXER_SMTP_PASSWORD` | _(empty)_ | SMTP auth password |
| `INBOXER_SMTP_FROM` | `no-reply@example.com` | Sender email address |

If the SMTP relay is unreachable, the mail status is set to `queued` for later delivery.

## Storage

SQLite database at `$INBOXER_DATA_DIR/inboxer.sqlite3` (default `/tmp/inboxer-data/inboxer.sqlite3`)
