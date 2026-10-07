# Caregivers & Consent

## Purpose

Allow patients to involve trusted caregivers while maintaining explicit control over healthcare data.

## Relationship

A caregiver relationship identifies who the caregiver is.

It does not automatically grant data access.

## Consent

Consent specifies:
- caregiver
- patient
- optional mission
- permissions
- expiry
- revocation

Example:

```json
{
  "view_documents": true,
  "view_missions": true,
  "view_appointments": false
}
```

## Access Decision

```text
Caregiver request
       |
       v
Active relationship?
       |
       v
Active consent?
       |
       v
Required permission?
       |
       v
Mission allowed?
       |
       v
Not expired/revoked?
       |
       v
ALLOW
```

Any failed condition should deny access.

## Revocation

When consent is revoked, the caregiver should immediately lose access to resources protected by that consent.

## Security

A caregiver must never be able to grant themselves additional permissions.
