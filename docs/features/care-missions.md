# Care missions and tasks

## User workflow

The Care tab loads active missions and assigned tasks. A user can create a
mission at `/mission/create`, open `/mission/[id]`, add/update tasks, inspect
mission events, share the mission, and open a mission-scoped assistant chat.

## Implementation

- [`missionEngine.ts`](../../services/missionEngine.ts) implements
  `createMission`, `transitionMission`, `getMissionDetails`,
  `getMissionEvents`, `getActiveMissionsForUser`, `addTaskToMission`, and
  `updateTaskStatus`.
- [`tasks.ts`](../../services/tasks.ts) assigns/unassigns tasks and records
  mission events.
- Screens use Supabase tables `care_missions`, `care_tasks`, and
  `mission_events`, with provider and consent relationships documented in
  [`DATABASE.md`](../../DATABASE.md).
- The state machine is implemented in service code and allows the configured
  lowercase lifecycle values; UI and mock data also contain older uppercase
  values, so the mock model is not interchangeable.

## Data flow

```text
Mission screen
  -> missionEngine/tasks service
  -> Supabase care_missions/care_tasks
  -> mission_events audit rows
  -> refreshed mission detail and task UI
```

Mission-specific assistant context is set through
`conversation_states.active_mission_id`. Care Circle sharing uses
`consents.mission_id` where the deployed schema permits it.

The Documents screen also creates mission tasks from OCR text: Gemini generates
task titles, the screen selects the most recently created active mission (or
creates a "Prescription Follow-up" mission), and inserts the titles as pending
tasks.

## Status

**Implemented, with workflow inconsistencies.** Cancellation, completion,
provider assignment, and notification behavior are not consistently complete.
Error handling in several screens logs failures without a recovery message.
