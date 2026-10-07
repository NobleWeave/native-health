# TODO

This is the working implementation checklist for CareFlow.

## 0. Project Foundation

- [ ] Confirm final React Native project structure
- [ ] Confirm Expo vs React Native CLI setup
- [ ] Configure TypeScript paths/import aliases if needed
- [ ] Configure environment variables
- [ ] Add `.env` to gitignore
- [ ] Verify no Supabase service-role/secret key exists in the mobile bundle
- [ ] Establish consistent error/loading UI patterns

## 1. Authentication

- [x] Replace demo credentials with Supabase Auth
- [x] Create centralized `AuthContext`
- [x] Restore persisted session on app startup
- [x] Listen for auth state changes
- [x] Implement email/password login
- [x] Implement email/password signup
- [x] Create `profiles` row automatically using auth trigger
- [ ] Configure email verification deep link
- [ ] Implement verification callback screen
- [ ] Implement forgot-password flow
- [ ] Implement reset-password deep link
- [ ] Add logout
- [ ] Add auth loading/splash state
- [ ] Add route/navigation guards
- [ ] Prevent client-side role escalation

## 2. Profile & Patient Health Data

- [x] Create `profiles`
- [ ] Create `patient_health_profiles`
- [ ] Add profile update screen
- [ ] Add patient health information screen
- [ ] Add validation for health-profile fields
- [ ] Add profile RLS
- [ ] Protect the `role` column from self-modification
- [ ] Add indexes for common lookups

## 3. Providers

- [x] Create `providers`
- [x] Create `provider_availability`
- [ ] Build provider listing
- [ ] Add specialty filtering
- [ ] Add location/distance filtering
- [ ] Add language filtering
- [ ] Add insurance filtering
- [ ] Add consultation fee filtering
- [ ] Build provider details screen
- [ ] Build provider onboarding/admin approval workflow
- [ ] Build provider availability management
- [ ] Add provider RLS tests

## 4. Care Missions

- [x] Create `care_missions`
- [x] Define mission state machine
- [x] Create `care_tasks`
- [ ] Build create-mission flow
- [ ] Build mission detail screen
- [ ] Generate/update care tasks
- [ ] Implement mission progress UI
- [ ] Implement provider assignment
- [ ] Implement cancellation
- [ ] Implement completion
- [ ] Add mission-level notifications
- [ ] Test patient/provider/admin access boundaries

Mission lifecycle:

```text
CREATED
   -> CARE_IDENTIFIED
   -> PROVIDER_SELECTED
   -> APPOINTMENT_BOOKED
   -> CONSULTATION
   -> FOLLOW_UP
   -> COMPLETED

Any applicable state -> CANCELLED
```

## 5. Appointments

- [x] Create `appointments`
- [x] Add appointment/mission consistency trigger
- [ ] Build appointment creation flow
- [ ] Build appointment list
- [ ] Build appointment details
- [ ] Confirm/reschedule/cancel workflow
- [ ] Provider appointment view
- [ ] Patient appointment view
- [ ] Appointment reminder notifications
- [ ] Prevent overlapping provider bookings
- [ ] Add appointment RLS tests

## 6. Documents

- [x] Create `documents`
- [ ] Create `medical-documents` Storage bucket
- [ ] Add Storage RLS/policies
- [ ] Build upload flow
- [ ] Generate stable document storage paths
- [ ] Build document list
- [ ] Build document details
- [ ] Add document deletion
- [ ] Add processing-status UI
- [ ] Implement optional OCR/text extraction
- [ ] Implement optional structured extraction
- [ ] Ensure provider access requires mission relationship or consent
- [ ] Test cross-patient document isolation

## 7. Caregivers & Consent

- [x] Create `caregivers`
- [x] Create `consents`
- [ ] Build caregiver invitation flow
- [ ] Build caregiver acceptance flow
- [ ] Build consent management screen
- [ ] Define permission keys
- [ ] Implement mission-specific consent
- [ ] Implement consent expiry
- [ ] Implement consent revocation
- [ ] Prevent caregivers from granting themselves permissions
- [ ] Test revoked/expired consent access

Initial permission concepts:

```text
view_documents
view_missions
view_appointments
view_tasks
```

## 8. Notifications

- [x] Create `notifications`
- [ ] Build notification center
- [ ] Mark notification read
- [ ] Add appointment reminders
- [ ] Add mission updates
- [ ] Add task reminders
- [ ] Add consent notifications
- [ ] Add document-processing notifications
- [ ] Decide push notification provider
- [ ] Add scheduled notification worker if required

## 9. AI Conversational Layer

- [ ] Define supported intents
- [ ] Define intent schema
- [ ] Implement intent router
- [ ] Implement informational-response path
- [ ] Implement action/tool path
- [ ] Define tool schemas
- [ ] Implement server-side tool execution
- [ ] Feed tool results back into conversation
- [ ] Persist relevant conversation context
- [ ] Add mission-aware context
- [ ] Add safe profile context
- [ ] Add prompt injection defenses
- [ ] Add model/API error handling
- [ ] Add rate limiting
- [ ] Log AI operations without unnecessarily storing sensitive content

Initial intent categories:

```text
INFORMATION
CREATE_MISSION
VIEW_MISSIONS
VIEW_TASKS
CREATE_APPOINTMENT
VIEW_APPOINTMENTS
FIND_PROVIDER
UPLOAD_DOCUMENT
VIEW_DOCUMENTS
CARE_GIVER
CONSENT
PROFILE
UNKNOWN
```

## 10. Navigation & UX

- [ ] Auth navigator
- [ ] App navigator
- [ ] Patient navigation
- [ ] Provider navigation
- [ ] Admin navigation
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Offline/network failure handling
- [ ] Accessibility pass
- [ ] Consistent typography/spacing/components

## 11. Security

- [ ] Review every RLS policy
- [ ] Test patient-to-patient isolation
- [ ] Test provider access boundaries
- [ ] Test admin access
- [ ] Prevent role self-escalation
- [ ] Review Storage policies
- [ ] Review AI data exposure
- [ ] Review deep-link security
- [ ] Validate all tool inputs server-side
- [ ] Remove demo credentials
- [ ] Remove debug secrets/logs

## 12. Testing

- [ ] Auth unit/integration tests
- [ ] RLS tests
- [ ] Mission lifecycle tests
- [ ] Appointment tests
- [ ] Consent tests
- [ ] Document access tests
- [ ] Provider matching tests
- [ ] AI intent tests
- [ ] Tool execution tests
- [ ] Navigation tests
- [ ] Error-state tests

## 13. Deployment

- [ ] Production Supabase project
- [ ] Production environment variables
- [ ] Storage policies
- [ ] Database migrations
- [ ] Edge/server functions if required
- [ ] AI provider configuration
- [ ] Push notification configuration
- [ ] Build configuration
- [ ] Production smoke test
- [ ] Security review
