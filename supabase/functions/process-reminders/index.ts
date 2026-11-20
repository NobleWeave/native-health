import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIVE_MINUTES_MS = 4 * 60 * 1000 + 50 * 1000; // 4m50s avoids 1-min cron drift
const ONE_HOUR_MS = 59 * 60 * 1000 + 30 * 1000;    // Flips cleanly at the 60-min mark

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  priority: "high";
  channelId: string;
  data: Record<string, unknown>;
};

async function sendExpoPushes(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return;

  // Expo Push API accepts up to 100 messages per batch
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      console.error("Expo push failed:", res.status, await res.text());
    }
  }
}

Deno.serve(async (req) => {
  try {
    // 1. Protect endpoint with a shared cron secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const nowIso = now.toISOString();
    const fiveMinsAgoIso = new Date(now.getTime() - FIVE_MINUTES_MS).toISOString();

    // 2. Fetch both newly due reminders and ringing reminders due for a 5-min nudge
    const [initialRes, followUpRes] = await Promise.all([
      supabase
        .from("task_reminders")
        .select(`
          *,
          patient:profiles!patient_id(full_name),
          mission:care_missions!mission_id(title),
          task:care_tasks!task_id(title)
        `)
        .eq("is_active", true)
        .eq("is_ringing", false)
        .lte("next_trigger_at", nowIso),

      supabase
        .from("task_reminders")
        .select(`
          *,
          patient:profiles!patient_id(full_name),
          mission:care_missions!mission_id(title),
          task:care_tasks!task_id(title)
        `)
        .eq("is_active", true)
        .eq("is_ringing", true)
        .or(`last_notified_at.is.null,last_notified_at.lte.${fiveMinsAgoIso}`),
    ]);

    if (initialRes.error) throw initialRes.error;
    if (followUpRes.error) throw followUpRes.error;

    const candidates = [
      ...(initialRes.data || []).map((r: any) => ({ reminder: r, isInitial: true })),
      ...(followUpRes.data || []).map((r: any) => ({ reminder: r, isInitial: false })),
    ];

    let processedCount = 0;

    for (const { reminder, isInitial } of candidates) {
      // 3. Optimistic-lock claim so overlapping cron ticks never double-send
      if (isInitial) {
        const { data: claimed } = await supabase
          .from("task_reminders")
          .update({
            is_ringing: true,
            ringing_since: nowIso,
            last_notified_at: nowIso,
            escalation_count: 1,
            updated_at: nowIso,
          })
          .eq("id", reminder.id)
          .eq("is_ringing", false)
          .select("id")
          .maybeSingle();

        if (!claimed) continue;
      } else {
        let claimQuery = supabase
          .from("task_reminders")
          .update({
            last_notified_at: nowIso,
            escalation_count: (reminder.escalation_count || 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", reminder.id)
          .eq("is_ringing", true);

        claimQuery = reminder.last_notified_at
          ? claimQuery.eq("last_notified_at", reminder.last_notified_at)
          : claimQuery.is("last_notified_at", null);

        const { data: claimed } = await claimQuery.select("id").maybeSingle();
        if (!claimed) continue;
      }

      processedCount++;

      // 4. Determine whether the 1-hour grace slot has elapsed
      const ringingStartMs = isInitial
        ? now.getTime()
        : new Date(reminder.ringing_since || nowIso).getTime();
      const isPastOneHourSlot = !isInitial && now.getTime() - ringingStartMs >= ONE_HOUR_MS;

      const patientName =
        (Array.isArray(reminder.patient)
          ? reminder.patient[0]?.full_name
          : reminder.patient?.full_name) || "Patient";
      const taskTitle =
        (Array.isArray(reminder.task)
          ? reminder.task[0]?.title
          : reminder.task?.title) || reminder.title;
      const missionTitle =
        (Array.isArray(reminder.mission)
          ? reminder.mission[0]?.title
          : reminder.mission?.title) || "Care Mission";

      // 5. Find all active caregivers (view OR manage consent for this mission)
      const { data: consentRows } = await supabase
        .from("consents")
        .select("caregiver_id, permissions, expires_at")
        .eq("patient_id", reminder.patient_id)
        .is("revoked_at", null)
        .or(`mission_id.eq.${reminder.mission_id},mission_id.is.null`);

      const caregiverIds = Array.from(
        new Set(
          (consentRows || [])
            .filter((c: any) => {
              if (c.expires_at && new Date(c.expires_at).getTime() <= now.getTime()) {
                return false;
              }
              return c.permissions?.view === true || c.permissions?.manage === true;
            })
            .map((c: any) => c.caregiver_id)
            .filter((id: string) => id && id !== reminder.patient_id),
        ),
      );

      // 6. Build patient + caregiver payloads
      const patientTitle = reminder.title.slice(0, 200);
      const patientBody = `Time for "${taskTitle}" (${missionTitle}). Open CareFlow to snooze once completed.`.slice(
        0,
        2000,
      );

      const caregiverTitle = (
        isPastOneHourSlot
          ? `Overdue: ${reminder.title}`
          : `Care Reminder: ${reminder.title}`
      ).slice(0, 200);

      const caregiverBody = (
        isPastOneHourSlot
          ? `${patientName} has not yet completed the task ${reminder.title}`
          : `Reminder for ${patientName}: "${reminder.title}" (${taskTitle}).`
      ).slice(0, 2000);

      const recipients = [
        {
          userId: reminder.patient_id as string,
          isPatient: true,
          title: patientTitle,
          body: patientBody,
        },
        ...caregiverIds.map((cgId) => ({
          userId: cgId,
          isPatient: false,
          title: caregiverTitle,
          body: caregiverBody,
        })),
      ];

      // 7. Log each delivery in public.notifications (also powers Realtime in-app alerts)
      const notificationRows = recipients.map((r) => ({
        user_id: r.userId,
        task_id: reminder.task_id,
        mission_id: reminder.mission_id,
        title: r.title,
        body: r.body,
        notification_type: "task_reminder",
        scheduled_at: reminder.next_trigger_at,
        sent_at: nowIso,
        status: "sent",
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notificationRows);

      if (notifError) {
        console.error("Failed to insert notifications:", notifError);
      }

      // 8. Fetch Expo push tokens for all recipients & send push notifications
      const recipientIds = recipients.map((r) => r.userId);
      const { data: tokenRows } = await supabase
        .from("user_push_tokens")
        .select("user_id, expo_push_token")
        .in("user_id", recipientIds);

      const recipientMap = new Map(recipients.map((r) => [r.userId, r]));
      const pushMessages: ExpoPushMessage[] = [];

      for (const row of tokenRows || []) {
        const target = recipientMap.get(row.user_id);
        if (!target || !row.expo_push_token?.startsWith("ExponentPushToken[")) {
          continue;
        }
        pushMessages.push({
          to: row.expo_push_token,
          sound: "default",
          title: target.title,
          body: target.body,
          priority: "high",
          channelId: "careflow-reminders",
          data: {
            type: "task_reminder",
            reminderId: reminder.id,
            taskId: reminder.task_id,
            missionId: reminder.mission_id,
            isPatient: target.isPatient,
            isOverdue: isPastOneHourSlot,
          },
        });
      }

      await sendExpoPushes(pushMessages);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: processedCount }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("process-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});