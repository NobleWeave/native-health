import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { transitionMission } from "../../services/missionEngine";
import {
  getProviderIdByProfileId,
  fetchProviderAppointments,
  updateAppointmentStatus,
} from "../../services/appointmentModel";
import {
  fetchProviderAvailability,
  addAvailabilitySlot,
  toggleSlotAvailability,
  deleteAvailabilitySlot,
} from "../../services/availabilityModel";
import { supabase } from "../../services/supabase/client";

export default function ProviderScheduleScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"appointments" | "availability">(
    "appointments",
  );

  const [providerId, setProviderId] = useState<string | null>(null);

  // Appointments State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("upcoming");

  // Availability State
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;

      async function loadData() {
        try {
          const pId = await getProviderIdByProfileId(user!.id);
          if (!pId || cancelled) {
            if (!cancelled) setLoading(false);
            return;
          }
          setProviderId(pId);

          const [apts, slots] = await Promise.all([
            fetchProviderAppointments(pId),
            fetchProviderAvailability(pId),
          ]);

          if (!cancelled) {
            if (apts) setAppointments(apts);
            if (slots) setAvailabilities(slots);
          }
        } catch (error) {
          console.error("Failed to load schedule data:", error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      void loadData();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );
  console.log(JSON.stringify(availabilities, null, 2));
  // ----------------------------------------------------
  // APPOINTMENT HANDLERS
  // ----------------------------------------------------
  const updateStatus = async (appointment: any, newStatus: string) => {
    setActionLoading(true);
    try {
      if (newStatus === "approved") {
        const { error } = await supabase.rpc(
          "approve_appointment_and_advance_mission",
          { p_appointment_id: appointment.id }
        );
        if (error) throw error;
      } else {
        await updateAppointmentStatus(appointment.id, newStatus);
      }

      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointment.id ? { ...apt, status: newStatus } : apt
        )
      );
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== "all" && apt.status !== statusFilter) return false;

    const aptDate = new Date(apt.scheduled_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateFilter === "today") {
      return aptDate >= today && aptDate < tomorrow;
    } else if (dateFilter === "upcoming") {
      return aptDate >= today;
    } else if (dateFilter === "past") {
      return aptDate < today;
    }
    return true;
  });

  // ----------------------------------------------------
  // AVAILABILITY HANDLERS
  // ----------------------------------------------------
  const handleAddSlot = async () => {
    if (!providerId) return;
    if (!slotDate.trim() || !slotStart.trim() || !slotEnd.trim()) {
      Alert.alert(
        "Missing Info",
        "Please enter date, start time, and end time.",
      );
      return;
    }

    try {
      setActionLoading(true);

      // Parse YYYY-MM-DD and HH:MM
      const padTime = (t: string) => {
        const [h = "00", m = "00"] = t.trim().split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      };

      const startDate = new Date(`${slotDate.trim()}T${padTime(slotStart)}:00`);
      const endDate = new Date(`${slotDate.trim()}T${padTime(slotEnd)}:00`);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        Alert.alert("Invalid Format", "Use YYYY-MM-DD for date and HH:MM (24h) for time.");
        setActionLoading(false);
        return;
      }

      const startTimestamp = startDate.toISOString();
      const endTimestamp = endDate.toISOString();

      if (new Date(startTimestamp) >= new Date(endTimestamp)) {
        Alert.alert("Invalid Time", "End time must be after start time.");
        setActionLoading(false);
        return;
      }

      const data = await addAvailabilitySlot(
        providerId,
        startTimestamp,
        endTimestamp,
      );

      setAvailabilities((prev) =>
        [...prev, data].sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        ),
      );
      setSlotDate("");
      setSlotStart("");
      setSlotEnd("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message || "Could not add time slot. Please check format.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      await toggleSlotAvailability(id, currentStatus);
      setAvailabilities((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, is_available: !currentStatus } : s,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle availability:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteAvailability = (id: string) => {
    Alert.alert(
      "Delete Slot",
      "Are you sure you want to remove this time slot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteAvailabilitySlot(id);
              setAvailabilities((prev) => prev.filter((s) => s.id !== id));
            } catch (error) {
              console.error("Failed to delete availability:", error);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  if (loading && !appointments.length) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#285C3B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule Manager</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "appointments" && styles.tabActive]}
          onPress={() => setActiveTab("appointments")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "appointments" && styles.tabTextActive,
            ]}
          >
            Appointments
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "availability" && styles.tabActive]}
          onPress={() => setActiveTab("availability")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "availability" && styles.tabTextActive,
            ]}
          >
            Availability
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* ========================================================= */}
        {/* APPOINTMENTS TAB */}
        {/* ========================================================= */}
        {activeTab === "appointments" && (
          <View>
            {/* Filters */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {["upcoming", "today", "past", "all"].map((filter) => (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterChip,
                      dateFilter === filter && styles.filterChipActive,
                    ]}
                    onPress={() => setDateFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        dateFilter === filter && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["all", "requested", "approved", "waitlisted"].map(
                  (filter) => (
                    <Pressable
                      key={filter}
                      style={[
                        styles.filterChip,
                        statusFilter === filter && styles.filterChipActive,
                      ]}
                      onPress={() => setStatusFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          statusFilter === filter &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {filter === "all"
                          ? "All Status"
                          : filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Text>
                    </Pressable>
                  ),
                )}
              </ScrollView>
            </View>

            {/* List */}
            {filteredAppointments.length === 0 ? (
              <Text style={styles.emptyText}>
                No appointments found for these filters.
              </Text>
            ) : (
              filteredAppointments.map((apt) => (
                <View key={apt.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.patientName}>
                        {apt.patient?.full_name}
                      </Text>
                      <Text style={styles.timeText}>
                        {new Date(apt.scheduled_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )}{" "}
                        ·{" "}
                        {new Date(apt.scheduled_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        styles[
                          `badge_${apt.status}` as
                            | "badge_requested"
                            | "badge_approved"
                            | "badge_waitlisted"
                            | "badge_revoked"
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          styles[
                            `badgeText_${apt.status}` as
                              | "badgeText_requested"
                              | "badgeText_approved"
                              | "badgeText_waitlisted"
                              | "badgeText_revoked"
                          ],
                        ]}
                      >
                        {apt.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {apt.status === "requested" && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.btn, styles.btnRevoke]}
                        onPress={() => updateStatus(apt, "rejected")}
                        disabled={actionLoading}
                      >
                        <Text style={styles.btnRevokeText}>Revoke</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.btnWaitlist]}
                        onPress={() => updateStatus(apt, "waitlisted")}
                        disabled={actionLoading}
                      >
                        <Text style={styles.btnWaitlistText}>Waitlist</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.btnApprove]}
                        onPress={() => updateStatus(apt, "approved")}
                        disabled={actionLoading}
                      >
                        <Text style={styles.btnApproveText}>Approve</Text>
                      </Pressable>
                    </View>
                  )}
                  {apt.status === "waitlisted" && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.btn, styles.btnApprove, { flex: 1 }]}
                        onPress={() => updateStatus(apt, "approved")}
                        disabled={actionLoading}
                      >
                        <Text style={styles.btnApproveText}>
                          Move to Approved
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* AVAILABILITY TAB */}
        {/* ========================================================= */}
        {activeTab === "availability" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.patientName}>Add New Time Slot</Text>
              <Text style={styles.timeText}>
                Create exact slots for patients to book consultations.
              </Text>

              <View style={styles.formGroup}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={slotDate}
                    onChangeText={setSlotDate}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (24h)"
                      value={slotStart}
                      onChangeText={setSlotStart}
                    />
                  </View>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM (24h)"
                      value={slotEnd}
                      onChangeText={setSlotEnd}
                    />
                  </View>
                </View>
              </View>

              <Pressable
                style={styles.primaryButton}
                onPress={handleAddSlot}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>+ Save Time Slot</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Your Availability</Text>
            {availabilities.length === 0 ? (
              <Text style={styles.emptyText}>
                You haven&apos;t set any availability yet.
              </Text>
            ) : (
              availabilities.map((slot) => {
                const d = new Date(slot.start_time);
                const dateStr = d.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const startStr = d.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const endStr = new Date(slot.end_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <View
                    key={slot.id}
                    style={[
                      styles.card,
                      !slot.is_available && styles.cardDimmed,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.patientName}>{dateStr}</Text>
                        <Text style={styles.timeText}>
                          {startStr} - {endStr}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          slot.is_available
                            ? styles.badge_approved
                            : styles.badge_cancelled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            slot.is_available
                              ? styles.badgeText_approved
                              : styles.badgeText_cancelled,
                          ]}
                        >
                          {slot.is_available ? "ACTIVE" : "PAUSED"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <Pressable
                        style={[
                          styles.btn,
                          {
                            backgroundColor: "#F7F8F6",
                            borderWidth: 1,
                            borderColor: "#E4E8E4",
                          },
                        ]}
                        onPress={() =>
                          toggleAvailability(slot.id, slot.is_available)
                        }
                      >
                        <Text
                          style={{
                            color: "#27312B",
                            fontWeight: "600",
                            fontSize: 13,
                          }}
                        >
                          {slot.is_available ? "Pause Slot" : "Re-activate"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.btnRevoke]}
                        onPress={() => deleteAvailability(slot.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#C0392B"
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8F6",
  },
  header: { padding: 20, backgroundColor: "white" },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  container: { padding: 20, paddingBottom: 40 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E8E4",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#285C3B" },
  tabText: { color: "#718078", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#285C3B", fontWeight: "700" },

  filterSection: { marginBottom: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#285C3B", borderColor: "#285C3B" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#52615A" },
  filterChipTextActive: { color: "#FFFFFF" },

  emptyText: { color: "#718078", textAlign: "center", marginTop: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 12,
    marginTop: 10,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 16,
  },
  cardDimmed: { opacity: 0.7, backgroundColor: "#FAFAFA" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  patientName: { fontSize: 16, fontWeight: "700", color: "#17201B" },
  timeText: { fontSize: 13, color: "#718078", marginTop: 4 },

  formGroup: { marginTop: 16, gap: 12 },
  inputWrap: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#52615A" },
  input: {
    backgroundColor: "#F7F8F6",
    borderWidth: 1,
    borderColor: "#E4E8E4",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#17201B",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badge_requested: { backgroundColor: "#FFF8E6", borderColor: "#FDE08B" },
  badgeText_requested: { color: "#976A00" },
  badge_approved: { backgroundColor: "#E6F4EA", borderColor: "#A5D6A7" },
  badgeText_approved: { color: "#2E7D32" },
  badge_waitlisted: { backgroundColor: "#E3F2FD", borderColor: "#90CAF9" },
  badgeText_waitlisted: { color: "#1565C0" },
  badge_revoked: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  badgeText_revoked: { color: "#C62828" },
  badge_cancelled: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0" },
  badgeText_cancelled: { color: "#616161" },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF0EE",
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRevoke: {
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#E2B8B8",
    flex: 0.5,
  },
  btnRevokeText: { color: "#C0392B", fontWeight: "600", fontSize: 13 },
  btnWaitlist: {
    backgroundColor: "#F7F8F6",
    borderWidth: 1,
    borderColor: "#DDE4DD",
  },
  btnWaitlistText: { color: "#52615A", fontWeight: "600", fontSize: 13 },
  btnApprove: { backgroundColor: "#285C3B" },
  btnApproveText: { color: "white", fontWeight: "600", fontSize: 13 },

  primaryButton: {
    backgroundColor: "#285C3B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "white", fontWeight: "700" },
});
