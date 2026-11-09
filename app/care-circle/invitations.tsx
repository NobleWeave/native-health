import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { getPendingInvitations, acceptCaregiverInvitation, declineCaregiverInvitation } from "../../services/careCircle";

export default function PendingInvitationsScreen() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        getPendingInvitations(user.id)
        .then(setInvitations)
        .catch((e) => Alert.alert("Error", "Could not load invitations."))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleAccept = async (id: string) => {
    try {
      await acceptCaregiverInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      Alert.alert("Accepted", "You are now part of their care circle.");
    } catch (e) {
      Alert.alert("Error", "Could not accept the invitation.");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineCaregiverInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
    } catch (e) {
      Alert.alert("Error", "Could not decline the invitation.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Pending Invitations</Text>
        <Text style={styles.sub}>Requests from patients asking you to manage their care.</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#285C3B" style={{ marginTop: 40 }} />
        ) : invitations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You have no pending invitations.</Text>
          </View>
        ) : (
          invitations.map((inv) => (
            <View key={inv.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{inv.patient.full_name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.patientName}>{inv.patient.full_name}</Text>
                  <Text style={styles.relationship}>Invited you as: {inv.relationship}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnDecline]} onPress={() => handleDecline(inv.id)}>
                  <Text style={styles.btnDeclineText}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnAccept]} onPress={() => handleAccept(inv.id)}>
                  <Text style={styles.btnAcceptText}>Accept Invite</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  backButton: { marginBottom: 20 },
  backText: { color: "#285C3B", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 6, marginBottom: 20 },
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#718078", fontSize: 15 },
  
  card: {
    backgroundColor: "white", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 16
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#DCE8DF",
    alignItems: "center", justifyContent: "center", marginRight: 14
  },
  avatarText: { color: "#315C3E", fontWeight: "700", fontSize: 18 },
  patientName: { fontSize: 16, fontWeight: "700", color: "#17201B" },
  relationship: { fontSize: 13, color: "#718078", marginTop: 3 },
  
  actions: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnDecline: { backgroundColor: "#F1F5EF" },
  btnDeclineText: { color: "#27312B", fontWeight: "600" },
  btnAccept: { backgroundColor: "#285C3B" },
  btnAcceptText: { color: "white", fontWeight: "600" },
});