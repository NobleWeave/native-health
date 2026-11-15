// services/profileModel.ts
import { supabase } from "./supabase/client";

// ─── Patient Health Profiles ─────────────────────────────

/** Fetch a patient's health profile */
export async function fetchPatientHealthProfile(patientId: string) {
  const { data, error } = await supabase
    .from("patient_health_profiles")
    .select("*")
    .eq("patient_id", patientId)
    .single();

  // PGRST116 = no rows found, which is not an error for us
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

/** Upsert (create or update) a patient's health profile */
export async function upsertPatientHealthProfile(patientId: string, profile: {
  date_of_birth?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
}) {
  const { error } = await supabase
    .from("patient_health_profiles")
    .upsert({
      patient_id: patientId,
      date_of_birth: profile.date_of_birth || null,
      blood_group: profile.blood_group || null,
      allergies: profile.allergies || null,
      conditions: profile.conditions || null,
      medications: profile.medications || null,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return true;
}

/** Insert a new patient health profile during onboarding */
export async function createPatientHealthProfile(patientId: string, profile: {
  date_of_birth?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
}) {
  const { error } = await supabase
    .from("patient_health_profiles")
    .insert({
      patient_id: patientId,
      date_of_birth: profile.date_of_birth || null,
      blood_group: profile.blood_group || null,
      allergies: profile.allergies || null,
      conditions: profile.conditions || null,
      medications: profile.medications || null,
    });

  if (error) throw error;
  return true;
}

/** Get the count of active caregivers for a patient */
export async function fetchCareCircleCount(patientId: string) {
  const { count, error } = await supabase
    .from("caregivers")
    .select("*", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("status", "active");

  if (error) throw error;
  return count || 0;
}

// ─── Provider Profiles ───────────────────────────────────

/** Fetch a provider's profile by their auth profile_id */
export async function fetchProviderProfile(profileId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

/** Fetch a provider's profile strictly by the provider table ID */
export async function getProviderById(providerId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .single();

  if (error) throw error;
  return data;
}

/** Update a provider's profile */
export async function updateProviderProfile(profileId: string, updates: {
  provider_type?: string | null;
  speciality?: string | null;
  consultation_fee?: number | null;
  address?: string | null;
  languages?: string[];
  insurance_schemes?: string[];
  accessibility?: string[];
}) {
  const { error } = await supabase
    .from("providers")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);

  if (error) throw error;
  return true;
}
