import { supabase } from "./supabase/client";

export async function inviteCaregiver(patientId: string, caregiverEmail: string, relationship: string) {
  // 1. Look up caregiver profile ID by email
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("email", caregiverEmail.toLowerCase()).single();
  // console.log("Profile lookup result:", profile, profileError);
  if (profileError || !profile) throw new Error("User not found");

  // 2. Create pending relationship
  const { data, error } = await supabase.from("caregivers").insert({
    patient_id: patientId,
    caregiver_id: profile.id,
    relationship,
    status: "pending"
  });
  console.log("Caregiver relationship creation result:", data, error);

  if (error) throw new Error("Failed to create caregiver relationship.");
  return data;
}

export async function getActiveCaregivers(patientId: string) {
  const { data, error } = await supabase
    .from("caregivers")
    .select(`
      id,
      caregiver_id,
      status,
      relationship,
      status,
      caregiver:profiles!caregiver_id(id, full_name, email)
    `)
    .eq("patient_id", patientId)
    .eq("status", "active");

  if (error) throw error;
  return data;
}

export async function grantConsent(patientId: string, caregiverId: string, permissions: object, missionId?: string) {
  const { data, error } = await supabase
    .from("consents")
    .insert({
      patient_id: patientId,
      caregiver_id: caregiverId,
      mission_id: missionId || null,
      permissions
    })
    .select()
    .single();
  
  console.log("Grant consent result:", data, error);

  if (error) throw error;
  return data;
}

// Fetch invitations where the current user is the invited caregiver
export async function getPendingInvitations(currentUserId: string) {
  const { data, error } = await supabase
    .from("caregivers")
    .select(`
      id,
      relationship,
      patient:profiles!patient_id(id, full_name, email)
    `)
    .eq("caregiver_id", currentUserId)
    .eq("status", "pending"); //

  if (error) throw error;
  return data;
}

// Accept the invitation
export async function acceptCaregiverInvitation(invitationId: string) {
  const { data, error } = await supabase
    .from("caregivers")
    .update({ status: "active" }) //[cite: 2]
    .eq("id", invitationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Optional: Decline the invitation
export async function declineCaregiverInvitation(invitationId: string) {
  const { error } = await supabase
    .from("caregivers")
    .delete() // Or update status to 'revoked'[cite: 2]
    .eq("id", invitationId);

  if (error) throw error;
}

// Fetch missions shared with the caregiver
export async function getSharedMissions(caregiverId: string) {
  const { data, error } = await supabase
    .from("consents")
    .select(`
      permissions,
      mission_id,
      mission:care_missions!mission_id (
        id, title, status, patient_id,
        patient:profiles!patient_id(full_name),
        care_tasks(id, title, status, assigned_to)
      )
    `)
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null);

  console.log("Shared missions for caregiver:", data, error);

  if (error) throw error;
  
  // Filter out any consents where the mission itself might have been deleted
  return (data || []).filter((row) => row.mission !== null);
}

// Fetch all active consents for a specific mission (used by the Patient to see who has access)
export async function getMissionConsents(missionId: string) {
  const { data, error } = await supabase
    .from("consents")
    .select(`
      id,
      patient_id,
      caregiver_id,
      mission_id,
      permissions,
      expires_at,
      revoked_at,
      caregiver:profiles!caregiver_id(id, full_name)
    `)
    .eq("mission_id", missionId)
    .is("revoked_at", null);

  if (error) throw error;
  return data;
}

// Revoke a caregiver's access to a specific mission
export async function revokeMissionConsent(patientId: string, caregiverId: string, missionId: string) {
  const { error } = await supabase
    .from("consents")
    .update({ 
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", patientId)
    .eq("caregiver_id", caregiverId)
    .eq("mission_id", missionId)
    .is("revoked_at", null);

  if (error) throw error;
}

// Completely remove a caregiver from the patient's Care Circle
export async function removeCaregiverRelationship(patientId: string, caregiverId: string) {
  // 1. Mark the relationship as revoked
  const { error: relError } = await supabase
    .from("caregivers")
    .update({ 
      status: "revoked",
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", patientId)
    .eq("caregiver_id", caregiverId);

  if (relError) throw relError;

  // 2. Revoke all active consents across all missions for this caregiver
  await supabase
    .from("consents")
    .update({ 
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", patientId)
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null);
  
  const { data: patientMissions, error: missionsError } = await supabase
    .from("care_missions")
    .select("id")
    .eq("patient_id", patientId);

  if (missionsError) throw missionsError;

  const missionIds = (patientMissions || []).map((mission) => mission.id);
  if (missionIds.length === 0) return;

  const { error: tasksError } = await supabase
    .from("care_tasks")
    .update({ assigned_to: null, updated_at: new Date().toISOString() })
    .eq("assigned_to", caregiverId)
    .in("mission_id", missionIds)
    .neq("status", "completed"); // Don't modify historical completed tasks

  if (tasksError) throw tasksError;
}