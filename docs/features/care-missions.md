# Care Missions

## Purpose

A care mission represents a patient's healthcare objective and coordinates the steps needed to complete it.

## Example

```text
"I need to see a cardiologist."

        |
        v

Care Mission
"Cardiology consultation"

        |
        +--> Find provider
        +--> Select provider
        +--> Book appointment
        +--> Attend consultation
        +--> Follow-up
```

## Lifecycle

```text
CREATED
  |
  v
CARE_IDENTIFIED
  |
  v
PROVIDER_SELECTED
  |
  v
APPOINTMENT_BOOKED
  |
  v
CONSULTATION
  |
  v
FOLLOW_UP
  |
  v
COMPLETED
```

Applicable active missions can be cancelled.

## Tasks

A mission can contain multiple tasks.

Example:

```text
Mission: Cardiology consultation

Tasks:
- Find cardiologist
- Compare providers
- Book appointment
- Upload previous reports
- Attend appointment
- Complete follow-up
```

## Ownership

The patient owns the mission.

A provider may access it when legitimately assigned.

Admins have administrative access.

## AI Integration

The AI assistant can create/update missions only through validated application tools.
