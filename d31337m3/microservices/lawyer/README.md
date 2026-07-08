# Lawyer

The Lawyer service manages legal document generation, curation, signing, delivery, and archival.

## Responsibilities
- Generate legal documents for submission to data brokers.
- Retrieve and reuse document templates from Historian-backed storage.
- Personalize documents using client and broker details from CityHall and related services.
- Apply digital signatures or overlay signatures to generated documents.
- Deliver documents via email, print, upload, or export workflows.

## Implemented API
- GET /health
- POST /documents/generate to build a personalized document using a Historian template and broker details

## Integration Notes
- Lawyer reads templates and broker metadata from Historian.
- CityHall can provide client data to the generation payload.
- The generated document is returned as structured JSON so it can be stored, emailed, or uploaded by downstream services.
