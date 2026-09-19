// data/mockDb.ts

// -----------------------------
// TYPES
// -----------------------------

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: "patient" | "provider" | "caregiver" | "admin";
  language: string | null;
  created_at: string;
};

export type Provider = {
  id: string;
  name: string;
  provider_type: "doctor" | "clinic" | "hospital" | "lab";
  speciality: string | null;
  consultation_fee: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  languages: string[];
  insurance_schemes: string[];
  accessibility: string[];
  phone: string | null;
  created_at: string;
};

export type MissionStatus =
  | "CREATED"
  | "CARE_IDENTIFIED"
  | "PROVIDER_SELECTED"
  | "APPOINTMENT_BOOKED"
  | "PREPARATION"
  | "CONSULTATION"
  | "FOLLOW_UP"
  | "COMPLETED";

export type CareMission = {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  urgency: "routine" | "urgent" | "emergency" | null;
  status: MissionStatus;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CareTask = {
  id: string;
  mission_id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "COMPLETED";
  due_at: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  mission_id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  location: string | null;
  notes: string | null;
  created_at: string;
};

export type DocumentStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "EXTRACTED"
  | "CONFIRMED"
  | "FAILED";

export type Document = {
  id: string;
  patient_id: string;
  mission_id: string | null;
  file_path: string;
  document_type: "prescription" | "report" | "lab_result" | "other";
  extracted_text: string | null;
  structured_data: Record<string, unknown> | null;
  status: DocumentStatus;
  created_at: string;
};

export type Caregiver = {
  id: string;
  patient_id: string;
  caregiver_id: string;
  relationship: string | null;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  created_at: string;
};

export type Consent = {
  id: string;
  patient_id: string;
  caregiver_id: string;
  mission_id: string | null;

  permissions: {
    view_appointment: boolean;
    view_documents: boolean;
    manage_tasks: boolean;
  };

  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ProviderAvailability = {
  id: string;
  provider_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

export type Notification = {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  body: string;
  type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  created_at: string;
};

// -----------------------------
// MOCK DATA
// -----------------------------

const now = new Date().toISOString();

export const mockDb = {
  // profiles table
  profiles: [
    {
      id: "patient-1",
      full_name: "Demo Patient",
      phone: "+91 9000000000",
      email: "patient@example.com",
      role: "patient",
      language: "English",
      created_at: now,
    },

    {
      id: "caregiver-1",
      full_name: "Demo Caregiver",
      phone: "+91 9111111111",
      email: "caregiver@example.com",
      role: "caregiver",
      language: "English",
      created_at: now,
    },
  ] satisfies Profile[],

  // providers table
  providers: [
    {
      id: "provider-1",
      name: "Dr. Demo Sharma",
      provider_type: "doctor",
      speciality: "General Medicine",
      consultation_fee: 400,
      latitude: 23.8315,
      longitude: 91.2868,
      address: "Demo Clinic",

      languages: ["English", "Bengali", "Hindi"],

      insurance_schemes: ["Demo Insurance"],

      accessibility: ["wheelchair_access"],

      phone: "+91 9222222222",
      created_at: now,
    },
  ] satisfies Provider[],

  // care_missions table
  care_missions: [
    {
      id: "mission-1",
      patient_id: "patient-1",

      title: "Complete blood test",

      description: "Complete CBC and arrange follow-up.",

      urgency: "routine",

      status: "PREPARATION",

      provider_id: "provider-1",

      created_at: now,
      updated_at: now,

      completed_at: null,
    },
  ] satisfies CareMission[],

  // care_tasks table
  care_tasks: [
    {
      id: "task-1",
      mission_id: "mission-1",

      title: "Find a suitable laboratory",

      description: null,

      status: "COMPLETED",

      due_at: null,

      assigned_to: "patient-1",

      completed_at: now,

      created_at: now,
    },

    {
      id: "task-2",
      mission_id: "mission-1",

      title: "Complete CBC test",

      description: null,

      status: "PENDING",

      due_at: null,

      assigned_to: "patient-1",

      completed_at: null,

      created_at: now,
    },
  ] satisfies CareTask[],

  // appointments table
  appointments: [
    {
      id: "appointment-1",

      mission_id: "mission-1",

      patient_id: "patient-1",

      provider_id: "provider-1",

      scheduled_at: "2026-09-20T18:00:00+05:30",

      status: "SCHEDULED",

      location: "Demo Clinic",

      notes: null,

      created_at: now,
    },
  ] satisfies Appointment[],

  // documents table
  documents: [
    {
      id: "document-1",

      patient_id: "patient-1",

      mission_id: "mission-1",

      file_path: "documents/demo-prescription.jpg",

      document_type: "prescription",

      // This is exactly what your friend will eventually
      // populate using OCR.
      extracted_text:
        "Medicine A - 1 tablet twice daily for 7 days\nCBC\nFollow up after 14 days",

      // Later this will contain AI structured extraction.
      structured_data: null,

      status: "EXTRACTED",

      created_at: now,
    },
  ] satisfies Document[],

  // caregivers table
  caregivers: [
    {
      id: "caregiver-link-1",

      patient_id: "patient-1",

      caregiver_id: "caregiver-1",

      relationship: "father",

      status: "ACTIVE",

      created_at: now,
    },
  ] satisfies Caregiver[],

  // consents table
  consents: [
    {
      id: "consent-1",

      patient_id: "patient-1",

      caregiver_id: "caregiver-1",

      mission_id: "mission-1",

      permissions: {
        view_appointment: true,
        view_documents: false,
        manage_tasks: true,
      },

      expires_at: "2026-09-30T23:59:59+05:30",

      revoked_at: null,

      created_at: now,
    },
  ] satisfies Consent[],

  // provider_availability table
  provider_availability: [
    {
      id: "availability-1",

      provider_id: "provider-1",

      start_time: "2026-09-20T18:00:00+05:30",

      end_time: "2026-09-20T18:30:00+05:30",

      is_available: true,
    },
  ] satisfies ProviderAvailability[],

  // notifications table
  notifications: [
    {
      id: "notification-1",

      user_id: "patient-1",

      task_id: "task-2",

      title: "CBC test pending",

      body: "Your CBC test is still pending.",

      type: "TASK_REMINDER",

      scheduled_at: "2026-09-20T09:00:00+05:30",

      sent_at: null,

      status: "PENDING",

      created_at: now,
    },
  ] satisfies Notification[],
};

// -----------------------------
// HELPER FUNCTIONS
// -----------------------------

export function getMissionById(id: string) {
  return mockDb.care_missions.find((mission) => mission.id === id);
}

export function getTasksForMission(missionId: string) {
  return mockDb.care_tasks.filter((task) => task.mission_id === missionId);
}

export function getDocumentsForPatient(patientId: string) {
  return mockDb.documents.filter(
    (document) => document.patient_id === patientId,
  );
}

export function getDocumentsForMission(missionId: string) {
  return mockDb.documents.filter(
    (document) => document.mission_id === missionId,
  );
}

export function getProviders() {
  return mockDb.providers;
}
