import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createTaskReminder,
  deleteTaskReminder,
  fetchRemindersForTask,
  formatNextTrigger,
  formatReminderTime,
  normalize24hTime,
  type TaskReminder,
} from "../services/reminderModel";

type TaskReminderModalProps = {
  visible: boolean;
  task: { id: string; title: string } | null;
  missionTitle?: string;
  onClose: () => void;
};

export function TaskReminderModal({
  visible,
  task,
  missionTitle,
  onClose,
}: TaskReminderModalProps) {
  const [title, setTitle] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReminders = useCallback(async (taskId: string) => {
    setLoadingList(true);
    try {
      const data = await fetchRemindersForTask(taskId);
      setReminders(data);
    } catch (error) {
      console.error("Failed to fetch task reminders:", error);
      Alert.alert("Error", "Could not load existing reminders for this task.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (visible && task) {
      setTitle(task.title);
      setTimeInput("");
      void loadReminders(task.id);
    }
  }, [visible, task, loadReminders]);

  const handleSaveReminder = async () => {
    if (!task) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing Title", "Please enter a notification title.");
      return;
    }

    const normalized = normalize24hTime(timeInput);
    if (!normalized) {
      Alert.alert(
        "Invalid Time",
        "Enter time in 24-hour HH:MM format between 00:00 and 24:00 (for example: 08:30 or 20:00).",
      );
      return;
    }

    setSaving(true);
    try {
      const created = await createTaskReminder(task.id, trimmedTitle, normalized);
      setReminders((prev) =>
        [...prev, created].sort((a, b) =>
          a.reminder_time.localeCompare(b.reminder_time),
        ),
      );
      setTimeInput("");
      Alert.alert(
        "Reminder Set",
        `Daily reminder "${created.title}" set for ${formatReminderTime(created.reminder_time)} (${normalized}).`,
      );
    } catch (error: any) {
      Alert.alert(
        "Could Not Set Reminder",
        error?.message || "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReminder = (reminder: TaskReminder) => {
    Alert.alert(
      "Delete Reminder",
      `Delete "${reminder.title}" (${formatReminderTime(reminder.reminder_time)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(reminder.id);
            try {
              await deleteTaskReminder(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error?.message || "Could not delete reminder.",
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.eyebrow}>TASK REMINDERS</Text>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {task?.title || "Set Reminder"}
              </Text>
              {!!missionTitle && (
                <Text style={styles.missionSub} numberOfLines={1}>
                  Mission: {missionTitle}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#52615A" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Add New Reminder Form */}
            <View style={styles.formCard}>
              <Text style={styles.sectionHeading}>Add Daily Reminder</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notification Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Take Amoxicillin 500mg"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={200}
                  editable={!saving}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time (24-hour format, 00:00–24:00)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (e.g. 08:30 or 20:00)"
                  placeholderTextColor="#94A3B8"
                  value={timeInput}
                  onChangeText={setTimeInput}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  editable={!saving}
                />
                <Text style={styles.hint}>
                  Patient and all caregivers will be notified daily at this time
                  (repeating every 5 mins until the patient snoozes).
                </Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={handleSaveReminder}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>+ Save Reminder</Text>
                )}
              </Pressable>
            </View>

            {/* Existing Reminders for This Task */}
            <Text style={styles.listHeading}>
              Existing Reminders ({reminders.length})
            </Text>

            {loadingList ? (
              <ActivityIndicator color="#285C3B" style={{ marginVertical: 20 }} />
            ) : reminders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No reminders set for this task yet.
                </Text>
              </View>
            ) : (
              reminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderRow}>
                  <View style={styles.reminderInfo}>
                    <View style={styles.reminderTopRow}>
                      <Text style={styles.reminderTitle} numberOfLines={1}>
                        {reminder.title}
                      </Text>
                      {reminder.is_ringing && (
                        <View style={styles.ringingBadge}>
                          <Text style={styles.ringingBadgeText}>DUE NOW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reminderTime}>
                      {formatReminderTime(reminder.reminder_time)} (
                      {reminder.reminder_time.slice(0, 5)}) ·{" "}
                      {formatNextTrigger(
                        reminder.next_trigger_at,
                        reminder.is_ringing,
                      )}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteReminder(reminder)}
                    disabled={deletingId === reminder.id}
                  >
                    {deletingId === reminder.id ? (
                      <ActivityIndicator size="small" color="#C0392B" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#C0392B"
                      />
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#F7F8F6",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "86%",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E8E4",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#718078",
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#17201B",
    marginTop: 3,
  },
  missionSub: {
    fontSize: 12,
    color: "#52665A",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E6EFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    gap: 14,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17201B",
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52615A",
  },
  input: {
    backgroundColor: "#F7F8F6",
    borderWidth: 1,
    borderColor: "#E4E8E4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#17201B",
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: "#718078",
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: "#285C3B",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  listHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    alignItems: "center",
  },
  emptyText: {
    color: "#718078",
    fontSize: 13,
    fontStyle: "italic",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 10,
    gap: 10,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17201B",
    flexShrink: 1,
  },
  ringingBadge: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ringingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#C62828",
  },
  reminderTime: {
    fontSize: 12,
    color: "#69736D",
    marginTop: 4,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#F5DADA",
    alignItems: "center",
    justifyContent: "center",
  },
});