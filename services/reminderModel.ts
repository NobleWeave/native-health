// services/reminderModel.ts
import { supabase } from "./supabase/client";

export type TaskReminder = {
  id: string;
  patient_id: string;
  mission_id: string;
  task_id: string;
  created_by: string;
  title: string;
  reminder_time: string; // PostgreSQL TIME e.g. "08:30:00"
  timezone: string;
  next_trigger_at: string;
  is_active: boolean;
  is_ringing: boolean;
  ringing_since: string | null;
  last_notified_at: string | null;
  last_snoozed_at: string | null;
  escalation_count: number;
  created_at: string;
  mission?: { id: string; title: string } | { id: string; title: string }[] | null;
  task?: { id: string; title: string } | { id: string; title: string }[] | null;
};

// ─── Time & Formatting Helpers ───────────────────────────

/**
 * Validates and normalizes 24-hour time input ("8:5", "08:05", "20:30", "24:00" -> "00:00").
 * Returns "HH:MM" or null if invalid.
 */
export function normalize24hTime(raw: string): string | null {
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  // Treat 24:00 as midnight (00:00), reject 24:01+
  if (hours === 24 && minutes === 0) {
    hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Formats a PostgreSQL TIME string ("20:00:00") into readable 12h + 24h display
 * without any UTC timezone drift.
 */
export function formatReminderTime(timeStr: string): string {
  const [hStr = "0", mStr = "00"] = timeStr.split(":");
  const hour24 = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const paddedMin = String(minute).padStart(2, "0");

  return `${hour12}:${paddedMin} ${period}`;
}

/**
 * Formats next_trigger_at in the user's local timezone (e.g. "Today · 8:00 PM").
 */
export function formatNextTrigger(isoString: string, isRinging = false): string {
  if (isRinging) return "Due now · Waiting to snooze";

  const target = new Date(isoString);
  if (Number.isNaN(target.getTime())) return "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  const timePart = target.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (target >= todayStart && target < tomorrowStart) {
    return `Today · ${timePart}`;
  }
  if (target >= tomorrowStart && target < dayAfterStart) {
    return `Tomorrow · ${timePart}`;
  }

  const datePart = target.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return `${datePart} · ${timePart}`;
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

export function unwrapRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

// ─── Reminder Queries & Mutations ────────────────────────

/** Fetch all active reminders for a specific task */
export async function fetchRemindersForTask(taskId: string): Promise<TaskReminder[]> {
  const { data, error } = await supabase
    .from("task_reminders")
    .select("*")
    .eq("task_id", taskId)
    .eq("is_active", true)
    .order("reminder_time", { ascending: true });

  if (error) throw error;
  return (data || []) as TaskReminder[];
}

/** Fetch upcoming active reminders for a patient (optionally capped, e.g. 3 for Home) */
export async function fetchUpcomingPatientReminders(
  patientId: string,
  limit?: number,
): Promise<TaskReminder[]> {
  let query = supabase
    .from("task_reminders")
    .select(`
      *,
      mission:care_missions!mission_id(id, title),
      task:care_tasks!task_id(id, title)
    `)
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("is_ringing", { ascending: false })
    .order("next_trigger_at", { ascending: true });

  if (limit && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TaskReminder[];
}

/** Fetch all currently ringing reminders for a patient (powers the Snooze modal) */
export async function fetchRingingRemindersForPatient(
  patientId: string,
): Promise<TaskReminder[]> {
  const { data, error } = await supabase
    .from("task_reminders")
    .select(`
      *,
      mission:care_missions!mission_id(id, title),
      task:care_tasks!task_id(id, title)
    `)
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .eq("is_ringing", true)
    .order("ringing_since", { ascending: true });

  if (error) throw error;
  return (data || []) as TaskReminder[];
}

/** Create a recurring daily reminder via the RBAC-enforced, timezone-safe RPC */
export async function createTaskReminder(
  taskId: string,
  title: string,
  reminderTime24h: string,
): Promise<TaskReminder> {
  const normalizedTime = normalize24hTime(reminderTime24h);
  if (!normalizedTime) {
    throw new Error("Enter a valid 24-hour time in HH:MM format (00:00 to 24:00).");
  }

  const { data, error } = await supabase.rpc("create_task_reminder", {
    p_task_id: taskId,
    p_title: title.trim(),
    p_reminder_time: normalizedTime,
    p_timezone: getDeviceTimezone(),
  });

  if (error) throw new Error(error.message || "Could not create reminder.");
  return data as TaskReminder;
}

/** Delete a reminder (allowed for patient or managing caregiver via RLS) */
export async function deleteTaskReminder(reminderId: string): Promise<boolean> {
  const { error } = await supabase
    .from("task_reminders")
    .delete()
    .eq("id", reminderId);

  if (error) throw error;
  return true;
}

/** Snooze a ringing reminder (enforced patient-only in Postgres RPC; reschedules for next day) */
export async function snoozeTaskReminder(reminderId: string): Promise<TaskReminder> {
  const { data, error } = await supabase.rpc("snooze_task_reminder", {
    p_reminder_id: reminderId,
  });

  if (error) throw new Error(error.message || "Could not snooze reminder.");
  return data as TaskReminder;
}

// ─── Push Token Persistence ──────────────────────────────

export async function saveUserPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
) {
  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,expo_push_token" },
  );

  if (error) throw error;
}

export async function removeUserPushToken(userId: string, expoPushToken: string) {
  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("expo_push_token", expoPushToken);

  if (error) console.warn("Failed to remove push token:", error);
}

// ─── Notification Inbox (public.notifications) ───────────

export type UserNotification = {
  id: string;
  user_id: string;
  task_id: string | null;
  appointment_id: string | null;
  mission_id: string | null;
  title: string;
  body: string;
  notification_type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  read_at: string | null;
  status: string;
  created_at: string;
};

/** Fetch recent notifications for the signed-in user (caregiver alerts, reminders, etc.) */
export async function fetchUserNotifications(
  userId: string,
  limit = 25,
): Promise<UserNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserNotification[];
}

/** Mark a single notification as read */
export async function markNotificationRead(notificationId: string): Promise<string> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", notificationId);

  if (error) throw error;
  return readAt;
}

/** Mark all unread notifications for the user as read */
export async function markAllNotificationsRead(userId: string): Promise<string> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: readAt })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return readAt;
}

/** Remove all stored push tokens for a user when they opt out of push alerts */
export async function removeAllUserPushTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_push_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

/** Delete a single notification owned by the current user */
export async function deleteUserNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

/** Clear all notifications for the current user */
export async function clearAllUserNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}