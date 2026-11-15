# Notifications

## Current status

The deployed schema documents a `notifications` table linked optionally to
tasks, appointments, and missions. The current client does not implement a
notification-center screen, notification queries, read-state updates, push
delivery, or a scheduler.

Home includes a hard-coded medication reminder presentation; it is not loaded
from `notifications`.

## Target behavior

Notifications should be generated from mission, task, appointment, consent, or
document events and remain the application record of notification state before
any push provider is added. No such end-to-end worker is present in this
repository.
