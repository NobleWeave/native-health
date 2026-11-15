import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { fetchPatientAppointments, cancelAppointment as cancelApt } from "../services/appointmentModel";

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointments() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchPatientAppointments(user.id);
        setAppointments(data);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAppointments();
  }, [user]);

  const handleCancelAppointment = async (id: string) => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await cancelApt(id);
            setAppointments(prev => prev.filter(apt => apt.id !== id));
          } catch (error) {
            console.error("Failed to cancel appointment:", error);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>My Appointments</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ActivityIndicator color="#285C3B" style={{ marginTop: 40 }} />
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You have no upcoming appointments.</Text>
            <Pressable style={styles.bookButton} onPress={() => router.push("/find-care")}>
              <Text style={styles.bookButtonText}>Find Care Providers</Text>
            </Pressable>
          </View>
        ) : (
          appointments.map((apt) => (
            <View key={apt.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{apt.provider?.name}</Text>
                  <Text style={styles.speciality}>{apt.provider?.speciality}</Text>
                </View>
                <View style={[styles.badge, styles[`badge_${apt.status}` as keyof typeof styles]]}>
                  <Text style={[styles.badgeText, styles[`badgeText_${apt.status}` as keyof typeof styles]]}>
                    {apt.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <Text style={styles.detailRow}>📅 {new Date(apt.scheduled_at).toLocaleString()}</Text>
                <Text style={styles.detailRow}>📍 {apt.location || apt.provider?.address || "Clinic Location"}</Text>
              </View>

              <Pressable style={styles.cancelBtn} onPress={() => handleCancelAppointment(apt.id)}>
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </Pressable>
            </View>
          ))
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
  container: { padding: 20, paddingBottom: 40 },
  
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#718078", fontSize: 15, marginBottom: 20 },
  bookButton: { backgroundColor: "#285C3B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  bookButtonText: { color: "white", fontWeight: "700" },

  card: { backgroundColor: "white", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  providerName: { fontSize: 16, fontWeight: "700", color: "#17201B" },
  speciality: { fontSize: 13, color: "#718078", marginTop: 4 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badge_requested: { backgroundColor: "#FFF8E6", borderColor: "#FDE08B" },
  badgeText_requested: { color: "#976A00" },
  badge_approved: { backgroundColor: "#E6F4EA", borderColor: "#A5D6A7" },
  badgeText_approved: { color: "#2E7D32" },
  badge_waitlisted: { backgroundColor: "#E3F2FD", borderColor: "#90CAF9" },
  badgeText_waitlisted: { color: "#1565C0" },

  detailsBox: { backgroundColor: "#F7F8F6", padding: 12, borderRadius: 10, gap: 8, marginBottom: 16 },
  detailRow: { color: "#27312B", fontSize: 13, fontWeight: "500" },

  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelBtnText: { color: "#C0392B", fontWeight: "600", fontSize: 14 },
});