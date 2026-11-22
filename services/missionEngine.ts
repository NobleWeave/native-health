import { supabase } from "./supabase/client";

// Aligned with the ENUMs in DATABASE.md
export type MissionState =
  | "created"
  | "care_identified"
  | "provider_selected"
  | "appointment_booked"
  | "consultation"
  | "follow_up"
  | "completed"
  | "cancelled";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

// The strict state transition map
export const VALID_TRANSITIONS: Record<MissionState, MissionState[]> = {
  created: ["care_identified", "cancelled"],
  care_identified: ["provider_selected", "cancelled"],
  provider_selected: ["appointment_booked", "cancelled"],
  appointment_booked: ["consultation", "cancelled"],
  consultation: ["follow_up", "completed"],
  follow_up: ["completed"],
  completed: [],
  cancelled: [],
};

/**
 * Core centralized transition function.
 * Validates the state change, updates the mission, and logs the event.
 */
export async function transitionMission(
  missionId: string,
  currentState: MissionState,
  nextState: MissionState,
  actorId: string,
  metadata: Record<string, any> = {}
) {
  // 1. Strict Validation
  const allowedNextStates = VALID_TRANSITIONS[currentState];
  if (!allowedNextStates.includes(nextState)) {
    throw new Error(
      `Invalid transition: Cannot move from ${currentState} to ${nextState}.`
    );
  }

  // 2. Execute Transaction-like Update
  // Note: For absolute safety, this should ideally be an RPC in Supabase, 
  // but doing it sequentially via the client works for the MVP.
  
  const { data: updatedMission, error: updateError } = await supabase
    .from("care_missions")
    .update({ 
      status: nextState,
      updated_at: new Date().toISOString(),
      ...(nextState === "completed" ? { completed_at: new Date().toISOString() } : {})
    })
    .eq("id", missionId)
    .eq("status", currentState) // Optimistic locking
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update mission state: ${updateError.message}`);
  }

  // 3. Log Audit Event
  await supabase.from("mission_events").insert({
    mission_id: missionId,
    event_type: "STATE_TRANSITION",
    actor_id: actorId,
    metadata: {
      from: currentState,
      to: nextState,
      ...metadata
    }
  });

  return updatedMission;
}

/**
 * Fetch a mission with its tasks
 */
export async function getMissionDetails(missionId: string) {
  const { data, error } = await supabase
    .from("care_missions")
    .select(`
      *,
      patient:profiles!patient_id(full_name),
      care_tasks (
        *,
        assignee:profiles!assigned_to(full_name)
      )
    `)
    .eq("id", missionId)
    .order("created_at", { referencedTable: "care_tasks", ascending: true })
    .single();

  if (error) throw error;
  return data;
}

export async function getMissionEvents(missionId: string) {
  // console.log("Fetching events for mission:", missionId);
  const { data, error } = await supabase
    .from("mission_events")
    .select(`
      id,
      event_type,
      created_at,
      metadata,
      actor:profiles!actor_id(full_name)
    `)
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false }); // Newest events at the top
  
  // console.log("Fetched mission events:", data, error);

  if (error) throw error;
  return data;
}

export async function getActiveMissionsForUser(userId: string) {
  const { data, error } = await supabase
    .from("care_missions")
    .select(`
      id,
      title,
      status,
      care_tasks (
        id,
        title,
        status
      )
    `)
    .eq("patient_id", userId)
    .not("status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: false });
  
  // console.log("Active missions for user:", data, error);

  if (error) throw error;
  return data;
}

export async function createMission(patientId: string, title: string, description: string) {
  const { data: mission, error } = await supabase
    .from("care_missions")
    .insert({
      patient_id: patientId,
      title,
      description,
      status: "created",
    })
    .select()
    .single();

  if (error) throw error;

  // Log audit event
  await supabase.from("mission_events").insert({
    mission_id: mission.id,
    event_type: "MISSION_CREATED",
    actor_id: patientId,
  });

  return mission;
}

export async function addTaskToMission(missionId: string, title: string, actorId: string, assignedTo?: string) {
  const { data: task, error } = await supabase
    .from("care_tasks")
    .insert({
      mission_id: missionId,
      title,
      status: "pending",
      assigned_to: assignedTo || null,
    })
    .select()
    .single();
  console.log("Task added to mission:", task, error);
  if (error) throw error;

  await supabase.from("mission_events").insert({
    mission_id: missionId,
    event_type: "TASK_ADDED",
    actor_id: actorId,
    metadata: { task_title: title }
  });

  return task;
}

export async function updateTaskStatus(taskId: string, missionId: string, status: TaskStatus, actorId: string) {
  const { data, error } = await supabase
    .from("care_tasks")
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .select()
    .single();
  
  console.log("Task status updated:", data, error);

  if (error) throw error;

  if (status === "completed") {
    await supabase.from("mission_events").insert({
      mission_id: missionId,
      event_type: "TASK_COMPLETED",
      actor_id: actorId,
      metadata: { task_id: taskId, task_title: data.title }
    });
  }

  return data;
}

export async function advanceMissionToProviderSelected(
  missionId: string,
  actorId: string
) {
  try {
    const mission = await getMissionDetails(missionId);
    let state = mission.status as MissionState;

    if (state === "created") {
      await transitionMission(missionId, "created", "care_identified", actorId);
      state = "care_identified";
    }
    if (state === "care_identified") {
      await transitionMission(
        missionId,
        "care_identified",
        "provider_selected",
        actorId
      );
    }
  } catch (err) {
    console.warn("Mission state transition to provider_selected skipped:", err);
  }
}

// export interface BookableMission {
//   id: string;
//   title: string;
//   status: MissionState;
//   patient_id: string;
//   isShared: boolean;
//   patientName: string | null;
// }

// /**
//  * Returns active missions a user can book appointments for:
//  * 1) Their own non-terminal missions
//  * 2) Non-terminal shared missions where they hold active `manage` consent
//  */
// export async function getBookableMissionsForUser(
//   userId: string,
// ): Promise<BookableMission[]> {
//   const nowIso = new Date().toISOString();

//   const [ownRes, sharedRes] = await Promise.all([
//     supabase
//       .from("care_missions")
//       .select("id, title, status, patient_id")
//       .eq("patient_id", userId)
//       .not("status", "in", "(completed,cancelled)")
//       .order("created_at", { ascending: false }),

//     supabase
//       .from("consents")
//       .select(`
//         permissions,
//         expires_at,
//         mission:care_missions!mission_id (
//           id,
//           title,
//           status,
//           patient_id,
//           patient:profiles!patient_id(full_name)
//         )
//       `)
//       .eq("caregiver_id", userId)
//       .is("revoked_at", null)
//       .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
//   ]);

//   if (ownRes.error) throw ownRes.error;
//   if (sharedRes.error) {
//     console.warn("Could not load shared bookable missions:", sharedRes.error);
//   }

//   const seen = new Set<string>();
//   const results: BookableMission[] = [];

//   for (const m of ownRes.data || []) {
//     seen.add(m.id);
//     results.push({
//       id: m.id,
//       title: m.title,
//       status: m.status as MissionState,
//       patient_id: m.patient_id,
//       isShared: false,
//       patientName: null,
//     });
//   }

//   const nowMs = Date.now();
//   for (const row of sharedRes.data || []) {
//     const perms = row.permissions as { manage?: boolean } | null;
//     if (!perms?.manage) continue;
//     if (row.expires_at && new Date(row.expires_at).getTime() <= nowMs) continue;

//     const mission = Array.isArray(row.mission) ? row.mission[0] : row.mission;
//     if (!mission || seen.has(mission.id)) continue;
//     if (mission.status === "completed" || mission.status === "cancelled") {
//       continue;
//     }

//     const patientRel = Array.isArray(mission.patient)
//       ? mission.patient[0]
//       : mission.patient;

//     seen.add(mission.id);
//     results.push({
//       id: mission.id,
//       title: mission.title,
//       status: mission.status as MissionState,
//       patient_id: mission.patient_id,
//       isShared: true,
//       patientName: patientRel?.full_name || "Patient",
//     });
//   }

//   return results;
// }