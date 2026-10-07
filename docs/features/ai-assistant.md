# AI Assistant

## Purpose

CareFlow's AI assistant is a conversational interface for healthcare information and care coordination.

It is not intended to replace a clinician.

## Core Design

The assistant uses an intent router.

```text
User message
     |
     v
Intent Router
     |
     +--> INFORMATION
     |       |
     |       v
     |      LLM
     |
     +--> ACTION
             |
             v
            Tool
             |
             v
        Application logic
             |
             v
          Database
             |
             v
        Tool result
             |
             v
            LLM
             |
             v
           User
```

## Informational Requests

Examples:

- What is an ECG?
- Why is an MRI performed?
- What does blood pressure mean?

These can use an LLM response with appropriate safety framing.

## Action Requests

Examples:

- Find a cardiologist.
- Show my appointments.
- Create a care mission.
- Show my documents.
- Book an appointment.

Action requests must map to explicit tools.

## Tool Requirements

Each tool should define:

- name
- purpose
- input schema
- validation
- authorization requirement
- implementation
- output schema

## Context

The model should receive only the context needed for the current task.

Possible context:

```text
Recent conversation
Current mission
Relevant task state
Relevant profile information
Tool results
```

Do not send the entire patient record by default.

## Security

The LLM must not:
- execute arbitrary SQL
- choose another user's ID
- bypass RLS
- change roles
- grant itself consent
- access unrestricted medical records

All sensitive actions require application-side authorization.

## Failure Handling

If the intent is uncertain:

```text
UNKNOWN
```

The assistant should ask a clarification question rather than executing a potentially harmful action.

If a tool fails, the assistant should report the failure clearly and not fabricate success.
