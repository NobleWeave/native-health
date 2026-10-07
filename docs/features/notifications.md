# Notifications

## Purpose

Provide users with timely updates about care workflows.

## Types

- Task reminder
- Appointment reminder
- Appointment created
- Appointment updated
- Appointment cancelled
- Mission update
- Document processed
- Consent request
- Consent updated
- System notification

## Lifecycle

```text
PENDING
   |
   v
SENT

or

PENDING
   |
   v
FAILED / CANCELLED
```

## Data Model

Notifications can reference:
- task
- appointment
- mission

They belong to a user.

## Future Push Notifications

The database notification record should remain the source of application state even if push notifications are later added.
