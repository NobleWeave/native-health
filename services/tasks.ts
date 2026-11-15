import { supabase } from "./supabase/client";
import { canAccess } from "../utils/permissions";

export async function assignTaskToCaregiver(
  missionId: string, 
  caregiverId: string, 
  taskTitle: string, 
  activeConsents: any[]
) {
  // 1. Module 3 permission check before assignment
  const isAuthorized = canAccess(activeConsents, "transport", "manage", { missionId });
  if (!isAuthorized) throw new Error("Caregiver lacks transport management permissions.");

  // 2. Module 2 integration: Create the task
  return supabase.from("care_tasks").insert({
    mission_id: missionId,
    assigned_to: caregiverId,
    title: taskTitle,
    status: "pending" // defaults to pending, in_progress, completed, or cancelled
  });
}

// For the Caregiver: Fetch tasks assigned to them across all missions
export async function getAssignedTasks(userId: string) {
  const { data, error } = await supabase
    .from("care_tasks")
    .select(`
      *,
      mission:care_missions!mission_id(title, patient:profiles!patient_id(full_name))
    `)
    .eq("assigned_to", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// For the Patient: Assign a specific task to a caregiver
export async function assignTask(taskId: string, caregiverId: string, missionId: string, actorId: string, taskTitle: string) {
  const { data, error } = await supabase
    .from("care_tasks")
    .update({ 
      assigned_to: caregiverId, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;

  // Log the assignment event in the mission timeline
  await supabase.from("mission_events").insert({
    mission_id: missionId,
    event_type: "TASK_ASSIGNED",
    actor_id: actorId,
    metadata: { task_id: taskId, task_title: taskTitle, assigned_to: caregiverId }
  });

  return data;
}

export async function unassignTask(taskId: string) {
  const { data, error } = await supabase
    .from("care_tasks")
    .update({ 
      assigned_to: null, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}