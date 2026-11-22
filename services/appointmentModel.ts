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

export async function bookAppointment(
  _patientId: string,
  providerId: string,
  missionId: string | null,
  scheduledAt: string,
  slotId?: string,
) {
  const { data, error } = await supabase.rpc(
    "book_appointment_and_lock_slot",
    {
      p_provider_id: providerId,
      p_mission_id: missionId,
      p_scheduled_at: scheduledAt,
      p_slot_id: slotId ?? null,
    },
  );

  if (error) throw error;
  return data;
}

export async function cancelAppointment(appointmentId: string) {
  const { data, error } = await supabase.rpc(
    "update_appointment_and_sync_slot",
    {
      p_appointment_id: appointmentId,
      p_new_status: "cancelled",
    },
  );

  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
) {
  if (status === "cancelled" || status === "rejected" || status === "waitlisted") {
    const { data, error } = await supabase.rpc(
      "update_appointment_and_sync_slot",
      {
        p_appointment_id: appointmentId,
        p_new_status: status,
      },
    );
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
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

/** Get provider dashboard stats: pending requests count and today's approved count */
export async function getProviderDashboardStats(providerId: string) {
  const { count: requests } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("status", "requested");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { count: todayCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("status", "approved")
    .gte("scheduled_at", startOfDay.toISOString())
    .lte("scheduled_at", endOfDay.toISOString());

  return { requests: requests || 0, today: todayCount || 0 };
}
