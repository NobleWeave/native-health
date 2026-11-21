import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Alert, Modal } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getProviderById } from "../../services/profileModel";
import { fetchProviderAvailability } from "../../services/availabilityModel";
import { getActiveMissionsForUser, advanceMissionToProviderSelected } from "../../services/missionEngine";
import { bookAppointment } from "../../services/appointmentModel";

export default function ProviderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [provider, setProvider] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking UI State
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [booking, setBooking] = useState(false);
  const [missionId, setMissionId] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      if (!id || !user) return;
      try {
        const [provData, availData, missionData] = await Promise.all([
          getProviderById(id),
          fetchProviderAvailability(id),
          getActiveMissionsForUser(user.id)
        ]);

        setProvider(provData);
        // Filter out past slots and disabled slots
        setSlots(availData.filter((s: any) => s.is_available && new Date(s.start_time) > new Date()));
        setMissions(missionData || []);

        if (missionData && missionData.length > 0) {
          setMissionId(missionData[0].id);
        }
      } catch (error) {
        Alert.alert("Error", "Could not load provider details.");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user]);

  const handleBook = async () => {
    if (!selectedSlot || !user) return;
    if (!missionId) {
      Alert.alert("Mission Required", "You must select or create an active care mission to book an appointment.");
      return;
    }

    setBooking(true);
    try {
      await bookAppointment(user.id, provider.id, missionId, selectedSlot.start_time);
      await advanceMissionToProviderSelected(missionId, user.id);

      Alert.alert(
        "Booking Requested",
        "Your appointment request has been sent to the provider.",
        [{ text: "OK", onPress: () => {
            setSelectedSlot(null);
            router.push("/appointments");
        }}]
      );
    } catch (error: any) {
       Alert.alert("Booking Failed", error.message || "Could not complete booking.");
    } finally {
       setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#285C3B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{provider.name}</Text>
          <Text style={styles.sub}>{provider.provider_type} · {provider.speciality}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#285C3B" />
            <Text style={styles.detailText}>{provider.address || "Address not provided"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#285C3B" />
            <Text style={styles.detailText}>{provider.phone || "Phone not provided"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Ionicons name="wallet-outline" size={20} color="#285C3B" />
            <Text style={styles.detailText}>
              {provider.consultation_fee ? `₹${provider.consultation_fee} per consultation` : "Fee not specified"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Facility Information</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Languages Spoken</Text>
          <Text style={styles.valueText}>{provider.languages?.join(", ") || "Not specified"}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Accepted Schemes</Text>
          <Text style={styles.valueText}>{provider.insurance_schemes?.join(", ") || "None specified"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Available Slots</Text>
        {slots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming availability at this time.</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((slot) => {
              const start = new Date(slot.start_time);
              const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Pressable
                  key={slot.id}
                  style={styles.slotBtn}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={styles.slotDate}>{dateStr}</Text>
                  <Text style={styles.slotTime}>{timeStr}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!selectedSlot} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSlot(null)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <Pressable onPress={() => setSelectedSlot(null)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>

            {selectedSlot && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmLabel}>Time:</Text>
                <Text style={styles.confirmValue}>
                  {new Date(selectedSlot.start_time).toLocaleString(undefined, {
                    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Link to Care Mission</Text>
            {missions.length === 0 ? (
              <Text style={styles.emptyText}>You need an active mission to book. Go to the Care tab to create one.</Text>
            ) : (
              <View style={styles.missionList}>
                {missions.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[styles.missionItem, missionId === m.id && styles.missionItemActive]}
                    onPress={() => setMissionId(m.id)}
                  >
                    <Ionicons name="flag-outline" size={16} color={missionId === m.id ? "#285C3B" : "#718078"} />
                    <Text style={[styles.missionText, missionId === m.id && styles.missionTextActive]}>{m.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable
              style={[styles.bookBtn, (booking || missions.length === 0) && { opacity: 0.7 }]}
              onPress={handleBook}
              disabled={booking || missions.length === 0}
            >
              {booking ? <ActivityIndicator color="white" /> : <Text style={styles.bookBtnText}>Request Appointment</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 16 },
  backText: { color: "#285C3B", fontSize: 16, fontWeight: "600" },

  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#17201B" },
  sub: { fontSize: 15, color: "#285C3B", fontWeight: "600", marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#17201B", marginBottom: 14, marginTop: 10 },

  card: { backgroundColor: "white", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailText: { fontSize: 15, color: "#27312B", flex: 1 },
  divider: { height: 1, backgroundColor: "#EEF0EE", marginVertical: 14 },

  label: { fontSize: 12, fontWeight: "700", color: "#718078", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  valueText: { fontSize: 15, color: "#17201B", fontWeight: "500" },

  emptyCard: { backgroundColor: "white", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E4E8E4", alignItems: "center" },
  emptyText: { color: "#718078", fontSize: 14, fontStyle: "italic", textAlign: "center" },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  slotBtn: { width: "48%", backgroundColor: "white", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#285C3B", alignItems: "center", marginBottom: 12 },
  slotDate: { fontSize: 12, color: "#52615A", fontWeight: "600", marginBottom: 4 },
  slotTime: { fontSize: 15, color: "#285C3B", fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalCloseText: { fontSize: 16, fontWeight: "600", color: "#718078" },

  confirmBox: { backgroundColor: "#F7F8F6", padding: 16, borderRadius: 12, marginBottom: 20 },
  confirmLabel: { fontSize: 12, color: "#718078", fontWeight: "600", marginBottom: 4 },
  confirmValue: { fontSize: 16, color: "#17201B", fontWeight: "700" },

  missionList: { marginBottom: 24 },
  missionItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 8 },
  missionItemActive: { backgroundColor: "#E6EFE7", borderColor: "#285C3B" },
  missionText: { fontSize: 14, color: "#52615A", fontWeight: "600" },
  missionTextActive: { color: "#285C3B" },
  bookBtn: { backgroundColor: "#285C3B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,marginTop: 10 },
  bookBtnText: { color: "white", fontWeight: "700", fontSize: 15  },
})