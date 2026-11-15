# Providers and matching

## User workflow

`/find-care` collects search constraints and calls
[`findAndRankCare`](../../services/navigator.ts). Results come from the
deployed `search_providers` RPC, are ranked client-side, and open
`/provider/[id]`. Provider details show profile information, availability,
active missions, and the booking action.

## Ranking

`navigator.ts` considers specialty, distance, consultation fee, insurance,
language, accessibility, and provider type using fixed weights. Availability
is currently awarded as a “slots available soon” score without joining or
checking actual provider availability. Language and scheme comparisons are
case-sensitive.

## Provider management

Provider onboarding and profile updates use `providers`; availability CRUD uses
`provider_availability`. Provider schedule operations are in
[`app/(tabs)/schedule.tsx`](../../app/(tabs)/schedule.tsx).

## Status

**Implemented, partial.** Search, ranking, details, onboarding, and schedule
operations exist. There is no complete provider approval/admin workflow, and
the ranking should not be described as a clinical “best provider” decision.
