import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  formatReminderTime,
  snoozeTaskReminder,
  unwrapRelation,
  type TaskReminder,
} from "../services/reminderModel";

type ReminderSnoozeModalProps = {
  reminders: TaskReminder[];
  onSnoozed: (reminderId: string) => void;
  onDismissTemporarily: () => void;
};

export function ReminderSnoozeModal({
  reminders,
  onSnoozed,
  onDismissTemporarily,
}: ReminderSnoozeModalProps) {
  const [snoozing, setSnoozing] = useState(false);

  const activeReminder = reminders[0];
  if (!activeReminder) return null;

  const mission = unwrapRelation(activeReminder.mission);
  const task = unwrapRelation(activeReminder.task);

  const ringingStart = activeReminder.ringing_since
    ? new Date(activeReminder.ringing_since)
    : null;
  const elapsedMinutes = ringingStart
    ? Math.max(0, Math.floor((Date.now() - ringingStart.getTime()) / 60000))
    : 0;
  const isOverdue = elapsedMinutes >= 60;

  const handleSnooze = async () => {
    if (snoozing) return;
    setSnoozing(true);
    try {
      await snoozeTaskReminder(activeReminder.id);
      onSnoozed(activeReminder.id);
    } catch (error: any) {
      Alert.alert(
        "Could not snooze",
        error?.message || "Please try again.",
      );
    } finally {
      setSnoozing(false);
    }
  };

  return (
    <Modal
      visible={Boolean(activeReminder)}
      transparent
      animationType="fade"
      onRequestClose={onDismissTemporarily}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, isOverdue && styles.iconWrapOverdue]}>
              <Ionicons
                name={isOverdue ? "alert-circle-outline" : "alarm-outline"}
                size={28}
                color={isOverdue ? "#C0392B" : "#285C3B"}
              />
            </View>
            {reminders.length > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  1 of {reminders.length} due
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.eyebrow}>
            {isOverdue ? "OVERDUE CARE REMINDER" : "CARE REMINDER DUE"}
          </Text>
          <Text style={styles.title}>{activeReminder.title}</Text>

          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color="#285C3B" />
              <Text style={styles.metaText}>
                Scheduled for {formatReminderTime(activeReminder.reminder_time)}
                {elapsedMinutes > 0 ? ` · ${elapsedMinutes} min ago` : " · Now"}
              </Text>
            </View>

            {task?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#285C3B" />
                <Text style={styles.metaText}>Task: {task.title}</Text>
              </View>
            )}

            {mission?.title && (
              <View style={styles.metaRow}>
                <Ionicons name="flag-outline" size={16} color="#285C3B" />
                <Text style={styles.metaText}>Mission: {mission.title}</Text>
              </View>
            )}
          </View>

          <Text style={styles.note}>
            Snoozing confirms you&apos;ve seen this reminder and schedules it for the
            same time tomorrow. Otherwise, reminders repeat every 5 minutes to you
            and your caregivers.
          </Text>

          <Pressable
            style={[styles.snoozeBtn, snoozing && styles.btnDisabled]}
            onPress={handleSnooze}
            disabled={snoozing}
          >
            {snoozing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.snoozeBtnText}>
                Snooze Reminder (Next: Tomorrow)
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.laterBtn}
            onPress={onDismissTemporarily}
            disabled={snoozing}
          >
            <Text style={styles.laterBtnText}>Not yet · Remind me in 5 mins</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 20, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E6EFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapOverdue: {
    backgroundColor: "#FFEBEE",
  },
  countBadge: {
    backgroundColor: "#F1F5EF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#285C3B",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#718078",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#17201B",
    marginTop: 4,
    marginBottom: 14,
  },
  metaBox: {
    backgroundColor: "#F7F8F6",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: "#27312B",
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: "#69736D",
    marginBottom: 18,
  },
  snoozeBtn: {
    backgroundColor: "#285C3B",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  snoozeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  laterBtn: {
    marginTop: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  laterBtnText: {
    color: "#718078",
    fontSize: 13,
    fontWeight: "600",
  },
});