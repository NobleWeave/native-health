import { supabase } from "./supabase/client";

export async function inviteCaregiver(
  patientId: string,
  caregiverEmail: string,
  relationship: string,
) {
  // 1. Look up caregiver profile ID by email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", caregiverEmail.trim().toLowerCase())
    .single();

  if (profileError || !profile) {
    throw new Error("User not found");
  }

  if (profile.id === patientId) {
    throw new Error("You cannot invite yourself as a caregiver.");
  }

  // 2. Check if a relationship row already exists for this patient + caregiver
  const { data: existing, error: existingError } = await supabase
    .from("caregivers")
    .select("id, status")
    .eq("patient_id", patientId)
    .eq("caregiver_id", profile.id)
    .maybeSingle();

  if (existingError) {
    throw new Error("Failed to check existing caregiver relationship.");
  }

  if (existing) {
    if (existing.status === "active") {
      throw new Error("This user is already in your Care Circle.");
    }
    if (existing.status === "pending") {
      throw new Error("An invitation is already pending for this user.");
    }

    // Re-invite a previously revoked caregiver by resetting the row to pending
    const { data, error } = await supabase
      .from("caregivers")
      .update({
        relationship,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to re-invite caregiver.");
    }
    return data;
  }

  // 3. No prior row — create a new pending relationship
  const { data, error } = await supabase
    .from("caregivers")
    .insert({
      patient_id: patientId,
      caregiver_id: profile.id,
      relationship,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create caregiver relationship.");
  }
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

export async function grantConsent(
  patientId: string,
  caregiverId: string,
  permissions: object,
  missionId?: string,
  expiresAt?: string | null,
) {
  const nowIso = new Date().toISOString();

  // Close out any prior unrevoked (including expired) row for this caregiver + mission
  if (missionId) {
    await supabase
      .from("consents")
      .update({
        revoked_at: nowIso,
        updated_at: nowIso,
      })
      .eq("patient_id", patientId)
      .eq("caregiver_id", caregiverId)
      .eq("mission_id", missionId)
      .is("revoked_at", null);
  }

  const { data, error } = await supabase
    .from("consents")
    .insert({
      patient_id: patientId,
      caregiver_id: caregiverId,
      mission_id: missionId || null,
      permissions,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single();

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

// Fetch active, non-expired missions shared with the caregiver
export async function getSharedMissions(caregiverId: string) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("consents")
    .select(`
      permissions,
      mission_id,
      expires_at,
      mission:care_missions!mission_id (
        id, title, status, patient_id,
        patient:profiles!patient_id(full_name),
        care_tasks(id, title, status, assigned_to)
      )
    `)
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) throw error;

  const nowMs = Date.now();
  return (data || []).filter((row: any) => {
    if (!row.mission) return false;
    if (row.expires_at && new Date(row.expires_at).getTime() <= nowMs) {
      return false;
    }
    return true;
  });
}

// Fetch all active, non-expired consents for a specific mission
export async function getMissionConsents(missionId: string) {
  const nowIso = new Date().toISOString();

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
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (error) throw error;
  return data || [];
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