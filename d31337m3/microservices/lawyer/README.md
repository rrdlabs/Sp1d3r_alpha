# Lawyer - Legal Document Generation & Delivery

Generates, curates, signs, and delivers legal documents for the platform. Pulls templates and broker data from Historian, personalizes content, and returns structured output for downstream delivery.

**Port:** 8200 (via pm2)

## Features

- **Template-based document generation** - fetches templates from Historian and fills placeholders
- **Broker data integration** - pulls broker metadata to populate document fields
- **Client personalization** - injects client name, broker details, and other context
- **Digital signature overlay** - applies signature placeholders to generated documents
- **Template CRUD via proxy** - create, list, update, and delete templates through Historian
- **Multi-jurisdiction coverage** - designed for North American legal document formats

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/templates` | List all templates (proxied from Historian) |
| GET | `/templates/:name` | Get a specific template body |
| POST | `/templates` | Create a template (body: `{name, body}`) |
| PUT | `/templates/:name` | Update a template body |
| DELETE | `/templates/:name` | Delete a template |
| POST | `/documents/generate` | Generate a personalized document |

## Document Generation

`POST /documents/generate` accepts:

```json
{
  "template_name": "opt-out-letter",
  "client_name": "John Doe",
  "broker_name": "equifax"
}
```

The service fetches the template from Historian, pulls broker rows, fills placeholders (`{client_name}`, `{broker_name}`, `{broker_details}`, `{signature}`), and returns the assembled document as structured JSON.

## Dependencies

- **Historian** (`http://127.0.0.1:8100`) - templates and broker data
