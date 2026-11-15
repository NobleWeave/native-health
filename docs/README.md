# CareFlow documentation

This documentation describes the implementation currently present in the
repository and the deployed schema represented by [`../DATABASE.md`](../DATABASE.md).
Statements marked **target**, **partial**, or **mock** are not claims that the
feature is complete.

## Architecture and data

- [Architecture overview](./architecture/overview.md)
- [End-to-end data flows](./architecture/data-flow.md)
- [Database reference](../DATABASE.md)
- [Security and RLS](./database/security-and-rls.md)

## Features

- [Authentication and onboarding](./features/authentication.md)
- [Care missions and tasks](./features/care-missions.md)
- [Providers and appointments](./features/provider-matching.md)
- [Appointments](./features/appointments.md)
- [Documents and daily logs](./features/documents.md)
- [Caregivers and consent](./features/caregivers-consent.md)
- [Messaging and care assistant](./features/messaging.md)
- [Notifications](./features/notifications.md)
- [Nutrition and public-health content](./features/nutrition-and-health-content.md)

## AI, backend, and operations

- [Care assistant](./ai/care-assistant.md)
- [RAG system](./ai/rag-system.md)
- [Backend integrations](./backend/integrations.md)
- [Development setup](./setup/development.md)
- [Deployment](./setup/deployment.md)
- [Troubleshooting](./maintenance/troubleshooting.md)
- [Known limitations](./maintenance/known-limitations.md)
