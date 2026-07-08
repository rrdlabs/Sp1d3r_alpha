# Inboxer

Inboxer provides the platform’s communications layer for support chat and staff messaging, plus SMTP outbound mail.

## Implemented API
- GET /health
- POST /messages to store a chat message for a channel
- GET /messages?channel=... to read stored messages
- POST /mail to send an outbound email using SMTP settings from the environment; if no relay is reachable, the message is recorded as queued for later delivery

## Integration Notes
- Messages are stored in a local SQLite database for the starter implementation.
- The service can be used by CityHall, Picaso, SpiderWire, and future staff workflows.
- SMTP delivery uses environment variables such as INBOXER_SMTP_HOST, INBOXER_SMTP_PORT, INBOXER_SMTP_USERNAME, INBOXER_SMTP_PASSWORD, and INBOXER_SMTP_FROM.
