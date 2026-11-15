// services/appointmentModel.ts
import { supabase } from "./supabase/client";

// ─── Patient-side ────────────────────────────────────────

/** Fetch all non-cancelled/revoked appointments for a patient */
export async function fetchPatientAppointments(patientId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id, scheduled_at, status, location, notes,
      provider:providers(name, speciality, address)
    `)
    .eq("patient_id", patientId)
    .not("status", "in", '("cancelled","revoked")')
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Cancel a patient's appointment */
export async function cancelAppointment(appointmentId: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);

  if (error) throw error;
  return true;
}

/** Book a new appointment attached to a mission */
export async function bookAppointment(patientId: string, providerId: string, missionId: string, scheduledAt: string) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patientId,
      provider_id: providerId,
      mission_id: missionId,
      scheduled_at: scheduledAt,
      status: "requested"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Provider-side ───────────────────────────────────────

/** Get the provider row id from the user's profile_id */
export async function getProviderIdByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from("providers")
    .select("id")
    .eq("profile_id", profileId)
    .single();

  if (error) throw error;
  return data?.id || null;
}

/** Fetch all appointments for a provider (with patient info) */
export async function fetchProviderAppointments(providerId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id, scheduled_at, status, notes, mission_id,
      patient:profiles!appointments_patient_id_fkey(full_name, phone)
    `)
    .eq("provider_id", providerId)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Update the status of an appointment */
export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: newStatus })
    .eq("id", appointmentId);

  if (error) throw error;
  return true;
}

/** Get provider dashboard stats: pending requests count and today's approved count */
export async function getProviderDashboardStats(providerId: string) {
  const { count: requests } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("status", "requested");

  const today = new Date().toISOString().split("T")[0];
  const { count: todayCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("status", "approved")
    .gte("scheduled_at", `${today}T00:00:00Z`)
    .lte("scheduled_at", `${today}T23:59:59Z`);

  return { requests: requests || 0, today: todayCount || 0 };
}
