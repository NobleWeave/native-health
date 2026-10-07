# Appointments

## Purpose

Coordinate scheduled interactions between patients and healthcare providers.

## Relationships

Each appointment is associated with:
- one patient
- one provider
- one care mission
- one scheduled time

## Status

```text
SCHEDULED
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

## Integrity

The appointment's patient must match the mission's patient.

This is enforced using a database trigger.

## Future Requirements

- Provider availability validation
- Overlap prevention
- Rescheduling
- Cancellation
- Reminders
- Provider confirmation
