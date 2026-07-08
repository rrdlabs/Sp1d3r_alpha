# Historian

The Historian service is the system-of-record and data-access control plane for the platform.

## Responsibilities
- Manage retrieval and archival of information into service-separated databases.
- Enforce the rule that data is only accessible through Historian.
- Provide a secure API for current services, future services, and Sp1d3r.
- Support encrypted-at-rest storage for persisted data.
- Provide administrative ingestion endpoints for broker data updates, including CSV imports.

## Implemented API
- GET /health
- POST /records to store a record for a service key
- GET /records/{key} to read a stored record
- POST /broker-import to store broker update rows
- POST /templates to register a template body

## Integration Notes
- Historian is the single gate for persistence and retrieval.
- Other services should call Historian rather than writing directly to local storage.
- The current implementation persists JSON records locally and encrypts stored values with a simple reversible encoding so the data flow is explicit and testable.
