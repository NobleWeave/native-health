# Provider Matching

## Purpose

Help patients find suitable healthcare providers using multiple criteria.

## Candidate Criteria

- Specialty
- Distance
- Consultation fee
- Insurance
- Language
- Availability
- Accessibility requirements
- Provider type

## Matching Flow

```text
Patient need
     |
     v
Intent extraction
     |
     v
Search constraints
     |
     v
Provider query
     |
     v
Candidate providers
     |
     v
Ranking/filtering
     |
     v
Patient selection
```

## Important Constraint

Provider matching is a recommendation/coordination feature. It must not claim that a provider is medically "best" solely from an algorithmic score.

## Future Enhancement

A weighted scoring model can be introduced:

```text
score =
  specialty_match
+ distance_score
+ availability_score
+ insurance_match
+ language_match
+ cost_score
```

Weights should remain configurable rather than hard-coded into UI logic.
