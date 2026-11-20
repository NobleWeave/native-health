import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import {
  deleteTaskReminder,
  fetchUpcomingPatientReminders,
  formatNextTrigger,
  formatReminderTime,
  snoozeTaskReminder,
  unwrapRelation,
  type TaskReminder,
} from "../services/reminderModel";

export default function RemindersScreen() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReminders = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        const data = await fetchUpcomingPatientReminders(user.id);
        setReminders(data);
      } catch (error) {
        console.error("Failed to load reminders:", error);
        Alert.alert("Error", "Could not load your reminders.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadReminders();
      }
    }, [loadReminders, user])
  );

  const handleDelete = (reminder: TaskReminder) => {
    Alert.alert(
      "Delete Reminder",
      `Are you sure you want to delete "${reminder.title}" (${formatReminderTime(reminder.reminder_time)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(reminder.id);
            try {
              await deleteTaskReminder(reminder.id);
              setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error?.message || "Could not delete reminder."
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleSnooze = async (reminder: TaskReminder) => {
    setBusyId(reminder.id);
    try {
      await snoozeTaskReminder(reminder.id);
      await loadReminders();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not snooze reminder.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>All Reminders</Text>
        <Text style={styles.sub}>
          Daily task reminders shared with your Care Circle.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadReminders(true)}
            tintColor="#285C3B"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#285C3B" style={{ marginTop: 40 }} />
        ) : reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="alarm-outline" size={30} color="#285C3B" />
            </View>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptyText}>
              Open any care mission and tap the alarm icon beside a task to set
              daily reminders.
            </Text>
            <Pressable
              style={styles.ctaButton}
              onPress={() => router.push("/(tabs)/care")}
            >
              <Text style={styles.ctaButtonText}>Go to Care Missions</Text>
            </Pressable>
          </View>
        ) : (
          reminders.map((reminder) => {
            const mission = unwrapRelation(reminder.mission);
            const task = unwrapRelation(reminder.task);
            const isBusy = busyId === reminder.id;

            return (
              <View
                key={reminder.id}
                style={[styles.card, reminder.is_ringing && styles.cardRinging]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      {reminder.is_ringing && (
                        <View style={styles.ringingBadge}>
                          <Text style={styles.ringingBadgeText}>DUE NOW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.nextText}>
                      {formatNextTrigger(
                        reminder.next_trigger_at,
                        reminder.is_ringing
                      )}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(reminder)}
                    disabled={isBusy}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${reminder.title}`}
                  >
                    {isBusy ? (
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

                <View style={styles.detailsBox}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={15} color="#285C3B" />
                    <Text style={styles.detailText}>
                      Daily at {formatReminderTime(reminder.reminder_time)} (
                      {reminder.reminder_time.slice(0, 5)})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="flag-outline" size={15} color="#285C3B" />
                    <Text style={styles.detailText}>
                      Mission: {mission?.title || "Care Mission"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={15}
                      color="#285C3B"
                    />
                    <Text style={styles.detailText}>
                      Task: {task?.title || "Task"}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerActions}>
                  {reminder.is_ringing && (
                    <Pressable
                      style={[styles.snoozeBtn, isBusy && { opacity: 0.7 }]}
                      onPress={() => void handleSnooze(reminder)}
                      disabled={isBusy}
                    >
                      <Text style={styles.snoozeBtnText}>
                        Snooze Until Tomorrow
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.missionLinkBtn}
                    onPress={() =>
                      router.push(`/mission/${reminder.mission_id}`)
                    }
                  >
                    <Text style={styles.missionLinkText}>Open Mission ›</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  header: { padding: 20, paddingBottom: 10 },
  backButton: { marginBottom: 12 },
  backText: { color: "#285C3B", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", fontSize: 13, marginTop: 4 },
  container: { padding: 20, paddingBottom: 40 },

  emptyState: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#E6EFE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 6,
  },
  emptyText: {
    color: "#718078",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  ctaButton: {
    backgroundColor: "#285C3B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 14,
  },
  cardRinging: {
    borderColor: "#F5C6CB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17201B",
  },
  nextText: {
    fontSize: 12,
    color: "#285C3B",
    fontWeight: "600",
    marginTop: 4,
  },
  ringingBadge: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ringingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C62828",
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

  detailsBox: {
    backgroundColor: "#F7F8F6",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    flex: 1,
    color: "#27312B",
    fontSize: 13,
    fontWeight: "500",
  },

  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  snoozeBtn: {
    flex: 1,
    backgroundColor: "#285C3B",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  snoozeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  missionLinkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginLeft: "auto",
  },
  missionLinkText: {
    color: "#285C3B",
    fontWeight: "700",
    fontSize: 13,
  },
});