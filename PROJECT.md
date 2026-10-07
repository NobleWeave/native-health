# CareFlow Project

## 1. Overview

CareFlow is a healthcare care-coordination platform designed to help patients move from a healthcare need to an organized care workflow.

The core idea is not to build another generic medical chatbot. Instead, CareFlow combines conversational assistance with deterministic healthcare workflow management.

A user can express a need conversationally, for example:

> "I need to find a cardiologist and book an appointment."

The system can identify the intent, create or update a care mission, search suitable providers, and coordinate the next action.

## 2. Problem

Healthcare tasks are often fragmented across:
- finding an appropriate provider
- understanding what to do next
- booking appointments
- tracking follow-up actions
- managing medical documents
- coordinating caregivers
- remembering deadlines and tasks

A chatbot can answer questions, but an answer alone does not complete the workflow.

CareFlow therefore focuses on:

```text
Conversation
     +
Healthcare workflow
     +
Provider coordination
     +
Documents
     +
Caregiver consent
     +
Notifications
```

## 3. Product Vision

Create a single patient-centered care coordination layer that can understand a healthcare request and help turn it into an actionable, trackable workflow.

## 4. Target Roles

### Patient

The primary user.

Can:
- manage profile
- maintain health information
- create care missions
- discover providers
- manage appointments
- manage documents
- invite caregivers
- grant/revoke consent
- track tasks
- interact with the AI assistant

### Provider

Can:
- maintain provider information
- manage availability
- view permitted patient/missions
- manage appointments
- update assigned care workflows

Provider access is controlled and must not be assumed merely because a profile has provider-like data.

### Admin

Can:
- manage providers
- manage users where appropriate
- oversee workflows
- perform administrative operations
- handle provider approval

## 5. Core Concepts

### Care Mission

A care mission represents a healthcare objective or episode of coordination.

Examples:
- Find a cardiologist
- Arrange a diagnostic test
- Follow up after consultation
- Manage a prescription/referral workflow

A mission can contain multiple tasks and can be associated with a provider and appointments.

### Care Task

A task is a concrete step inside a care mission.

Examples:
- Find cardiologist
- Upload previous ECG
- Book appointment
- Attend consultation
- Upload prescription
- Complete follow-up test

### Provider

A provider can be a:
- doctor
- clinic
- hospital
- laboratory
- pharmacy
- therapist
- other healthcare service

### Consent

Consent determines whether another person, such as a caregiver, can access specific patient information.

Consent is explicit, revocable, and optionally mission-specific.

## 6. Technology

### Mobile

- React Native
- TypeScript

### Backend

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- RLS

### AI

- LLM-based intent routing
- LLM-generated informational responses
- Controlled tool calling for application actions

## 7. Non-Goals

CareFlow is not intended to:
- replace a licensed healthcare professional
- autonomously diagnose disease
- prescribe medication
- provide emergency medical intervention
- allow an LLM to directly modify the database
- treat AI output as authoritative clinical advice

## 8. Success Criteria

The project should demonstrate:

1. A working authenticated healthcare workflow.
2. Secure role-aware data access.
3. A complete care mission lifecycle.
4. Provider discovery and appointment coordination.
5. Secure document and consent handling.
6. An AI interface capable of both answering and performing controlled actions.
7. Clear separation between AI reasoning and deterministic application logic.
