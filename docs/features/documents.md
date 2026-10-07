# Medical Documents

## Purpose

Allow patients to securely upload and manage medical documents.

## Supported Examples

- Prescription
- Lab report
- Diagnostic report
- Medical record
- Discharge summary
- Referral
- Insurance document
- Invoice

## Architecture

```text
Mobile app
   |
   v
Supabase Storage
   |
   +--> file binary
   |
   v
documents table
   |
   +--> metadata
   +--> processing status
   +--> extracted text
   +--> structured data
```

## Security

Access requires appropriate authorization.

Possible access sources:
- patient
- assigned provider
- authorized caregiver
- admin

Caregiver access requires active consent with the required permission.

## Processing

Future processing may include:
- OCR
- text extraction
- document classification
- structured data extraction

Processing should be asynchronous and represented by:

```text
pending
processing
completed
failed
```

The system must not silently treat extracted information as clinically verified.
