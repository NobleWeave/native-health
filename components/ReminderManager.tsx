import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase/client";
import {
  presentLocalReminderNotification,
  registerForPushNotificationsAsync,
} from "../services/notifications";
import {
  fetchRingingRemindersForPatient,
  type TaskReminder,
} from "../services/reminderModel";
import { ReminderSnoozeModal } from "./ReminderSnoozeModal";

export function ReminderManager() {
  const { user } = useAuth();
  const [ringingReminders, setRingingReminders] = useState<TaskReminder[]>([]);
  const [modalDismissed, setModalDismissed] = useState(false);

  const pushTokenRef = useRef<string | null>(null);
  const lastHandledResponseIdRef = useRef<string | null>(null);

  const syncRingingReminders = useCallback(
    async (forceShowModal = false): Promise<TaskReminder[]> => {
      if (!user) {
        setRingingReminders([]);
        return [];
      }

      try {
        // Strictly returns reminders where patient_id === user.id and is_ringing === true
        const due = await fetchRingingRemindersForPatient(user.id);
        setRingingReminders(due);
        if (forceShowModal && due.length > 0) {
          setModalDismissed(false);
        }
        return due;
      } catch (err) {
        console.error("Failed to fetch ringing reminders:", err);
        return [];
      }
    },
    [user],
  );

  const handleNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse | null) => {
      if (!response || !user) return;

      const responseId = response.notification.request.identifier;
      if (lastHandledResponseIdRef.current === responseId) return;
      lastHandledResponseIdRef.current = responseId;

      const data = response.notification.request.content.data as
        | {
            type?: string;
            missionId?: string;
            isPatient?: boolean;
          }
        | undefined;

      if (data?.type !== "task_reminder") return;

      // Always check if the signed-in user is the patient with a ringing reminder
      const due = await syncRingingReminders(true);

      // If this user is a caregiver (not the patient), open the mission instead
      if ((data.isPatient === false || due.length === 0) && data.missionId) {
        router.push(`/mission/${data.missionId}`);
      }
    },
    [syncRingingReminders, user],
  );

  useEffect(() => {
    if (!user) {
      setRingingReminders([]);
      setModalDismissed(false);
      pushTokenRef.current = null;
      return;
    }

    let active = true;

    // 1. Register push token & Android channel
    registerForPushNotificationsAsync(user.id)
      .then(({ token }) => {
        if (active) pushTokenRef.current = token;
      })
      .catch((err) => console.warn("Push registration error:", err));

    // 2. Check ringing reminders immediately on app launch / login
    void syncRingingReminders(true);

    // 3. Handle cold-start notification tap (app opened from killed state)
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (active && response) {
          void handleNotificationResponse(response);
        }
      })
      .catch(console.warn);

    // 4. Listen for incoming notifications while app is open
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as
          | { type?: string }
          | undefined;
        if (data?.type === "task_reminder") {
          void syncRingingReminders(true);
        }
      },
    );

    // 5. Listen for user tapping a notification (background / foreground)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleNotificationResponse(response);
      },
    );

    // 6. Re-check whenever app returns to the foreground
    const appStateSub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void syncRingingReminders(true);
        }
      },
    );

    // 7. Realtime subscription:
    //    - notifications INSERT -> triggers local notification if no remote push token (e.g. Expo Go)
    //    - task_reminders UPDATE -> pops/closes patient snooze modal immediately
    const channel = supabase
      .channel(`careflow-reminders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            title?: string;
            body?: string;
            notification_type?: string;
            task_id?: string | null;
            mission_id?: string | null;
          };

          if (row.notification_type !== "task_reminder") return;

          if (!pushTokenRef.current && row.title && row.body) {
            void presentLocalReminderNotification(row.title, row.body, {
              type: "task_reminder",
              taskId: row.task_id ?? undefined,
              missionId: row.mission_id ?? undefined,
            });
          }

          void syncRingingReminders(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "task_reminders",
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { is_ringing?: boolean };
          void syncRingingReminders(Boolean(updated?.is_ringing));
        },
      )
      .subscribe();

    return () => {
      active = false;
      receivedSub.remove();
      responseSub.remove();
      appStateSub.remove();
      void supabase.removeChannel(channel);
    };
  }, [handleNotificationResponse, syncRingingReminders, user]);

  const handleSnoozed = (reminderId: string) => {
    setRingingReminders((prev) => prev.filter((r) => r.id !== reminderId));
  };

  if (modalDismissed || ringingReminders.length === 0) {
    return null;
  }

  return (
    <ReminderSnoozeModal
      reminders={ringingReminders}
      onSnoozed={handleSnoozed}
      onDismissTemporarily={() => setModalDismissed(true)}
    />
  );
}