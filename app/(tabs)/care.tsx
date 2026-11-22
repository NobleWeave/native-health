import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MissionTask } from "../../components/MissionTask";
import { useAuth } from "../../context/AuthContext";
import { getActiveCaregivers, getSharedMissions, removeCaregiverRelationship } from "../../services/careCircle";
import { getActiveMissionsForUser } from "../../services/missionEngine";
import { getAssignedTasks } from "../../services/tasks";

export default function CareScreen() {
  const { user } = useAuth();
  const [activeCaregivers, setActiveCaregivers] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [sharedMissions, setSharedMissions] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [caregiversData, missionsData, sharedData, tasksData] = await Promise.all([
        getActiveCaregivers(user!.id),
        getActiveMissionsForUser(user!.id),
        getSharedMissions(user!.id),
        getAssignedTasks(user!.id)
      ]);
      // console.log("Dashboard data loaded:", { caregiversData, missionsData, sharedData });
      console.log("Assigned tasks loaded:", tasksData);
      setActiveCaregivers(caregiversData || []);
      setMyMissions(missionsData || []);
      setSharedMissions(sharedData || []);
      setMyTasks(tasksData || []);
    } catch (error) {
      console.error("Dashboard load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadDashboard();
      }
    }, [loadDashboard, user])
  );

  const handleRemoveCaregiver = (caregiverId: string, name: string) => {
    Alert.alert(
      "Remove Caregiver",
      `Are you sure you want to remove ${name} from your Care Circle? They will lose access to all your missions immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await removeCaregiverRelationship(user!.id, caregiverId);
              loadDashboard(); // Refresh the list
            } catch (error) {
              Alert.alert("Error", "Could not remove caregiver.");
            }
          }
        }
      ]
    );
  };

  const activeMyMissions = myMissions.filter(
    (m) => m.status !== "completed" && m.status !== "cancelled",
  );
  const pastMyMissions = myMissions.filter(
    (m) => m.status === "completed" || m.status === "cancelled",
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Care hub</Text>
        <Text style={styles.sub}>Manage your missions and care circle.</Text>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionCard} onPress={() => router.push("/care-circle/invite")}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add-outline" size={20} color="#285C3B" />
            </View>
            <Text style={styles.actionTitle}>Invite Caregiver</Text>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push("/care-circle/invitations")}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread-outline" size={20} color="#285C3B" />
            </View>
            <Text style={styles.actionTitle}>Invitations</Text>
          </Pressable>
        </View>

        {/* --- MISSIONS SHARED WITH ME (CAREGIVER VIEW) --- */}
        {sharedMissions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Shared With Me</Text>
            {sharedMissions.map((consentRow: any) => {
              const mission = consentRow.mission;
              const isManager = consentRow.permissions?.manage === true;
              const completed = mission.care_tasks?.filter((t: any) => t.status === "completed").length || 0;
              const total = mission.care_tasks?.length || 0;

              return (
                <Pressable 
                  key={mission.id}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push(`/mission/${mission.id}`)}
                >
                  <View style={styles.sharedHeader}>
                    <Text style={styles.name}>{mission.title}</Text>
                    <View style={[styles.badge, isManager ? styles.badgeManage : styles.badgeView]}>
                      <Text style={styles.badgeText}>{isManager ? "Manager" : "Viewer"}</Text>
                    </View>
                  </View>
                  <Text style={styles.sub}>Patient: {mission.patient?.full_name}</Text>
                  {consentRow.expires_at && (
                    <Text style={styles.expiryTag}>
                      Access until{" "}
                      {new Date(consentRow.expires_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {new Date(consentRow.expires_at).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                  )}
                  <Text style={styles.progress}>{completed} / {total} tasks completed</Text>
                </Pressable>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Your Care Circle</Text>
        {loading ? (
           <ActivityIndicator color="#285C3B" style={{ marginBottom: 20 }} />
        ) : activeCaregivers.length === 0 ? (
          <Text style={styles.emptyText}>No active caregivers in your circle yet.</Text>
        ) : (
          activeCaregivers.map((record) => (
            <View key={record.id} style={styles.caregiverCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{record.caregiver?.full_name}</Text>
                <Text style={styles.relationshipRole}>{record.relationship}</Text>
              </View>
              
              <Pressable 
                style={styles.removeBtn} 
                onPress={() => handleRemoveCaregiver(record.caregiver_id, record.caregiver?.full_name)}
              >
                <Ionicons name="person-remove-outline" size={20} color="#C0392B" />
              </Pressable>
            </View>
          ))
        )}

        {myTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Action Items</Text>
            <View style={[styles.card, { marginBottom: 24 }]}>
              {myTasks.map((task) => (
                <View key={task.id} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: "#718078", fontWeight: "700", letterSpacing: 0.5, marginBottom: -8, marginLeft: 34 }}>
                    {task.mission?.patient?.full_name} • {task.mission?.title?.toUpperCase()}
                  </Text>
                  <MissionTask 
                    text={task.title} 
                    done={task.status === "completed"} 
                    onPress={() => router.push(`/mission/${task.mission_id}`)} 
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active missions</Text>
          <Pressable onPress={() => router.push("/mission/create")}>
            <Text style={styles.addText}>+ New</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#285C3B" style={{ marginTop: 10 }} />
        ) : activeMyMissions.length === 0 ? (
          <Text style={styles.emptyText}>You have no active missions.</Text>
        ) : (
          activeMyMissions.map((mission: any) => {
            const completed = mission.care_tasks?.filter((t: any) => t.status === "completed").length || 0;
            const total = mission.care_tasks?.length || 0;

            return (
              <Pressable 
                key={mission.id}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/mission/${mission.id}`)}
              >
                <Text style={styles.name}>{mission.title}</Text>
                <Text style={styles.progress}>{completed} / {total} completed</Text>

                <View pointerEvents="none">
                  {mission.care_tasks?.slice(0, 4).map((task: any) => (
                    <MissionTask key={task.id} text={task.title} done={task.status === "completed"} />
                  ))}
                  {total > 4 && <Text style={styles.moreTasksText}>+ {total - 4} more action items...</Text>}
                </View>
              </Pressable>
            );
          })
        )}
        {pastMyMissions.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>Past Missions</Text>
            {pastMyMissions.map((mission) => {
              const tasks = mission.care_tasks || [];
              const completed = tasks.filter(
                (t: any) => t.status === "completed",
              ).length;
              const isCancelled = mission.status === "cancelled";

              return (
                <Pressable
                  key={mission.id}
                  style={[styles.card, { opacity: 0.78 }]}
                  onPress={() => router.push(`/mission/${mission.id}`)}
                >
                  <View style={styles.sharedHeader}>
                    <Text style={styles.name}>{mission.title}</Text>
                    <View
                      style={[
                        styles.badge,
                        isCancelled ? { backgroundColor: "#FFEBEE" } : styles.badgeManage,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isCancelled && { color: "#C62828" },
                        ]}
                      >
                        {isCancelled ? "Cancelled" : "Completed"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.progress}>
                    {completed} / {tasks.length} tasks completed
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 5, marginBottom: 20 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  actionCard: { width: "48%", backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E4E8E4", alignItems: "center" },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E6EFE7", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  actionTitle: { fontSize: 14, fontWeight: "700", color: "#17201B" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#17201B", marginBottom: 14, marginTop: 10 },
  caregiverCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 16 },
  relationshipRole: { fontSize: 13, color: "#718078", marginTop: 3 },
  emptyText: { color: "#718078", marginBottom: 24, fontStyle: "italic" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 16 },
  name: { fontSize: 17, fontWeight: "700", color: "#17201B" },
  progress: { fontSize: 12, color: "#718078", marginTop: 5, marginBottom: 14 },
  moreTasksText: { color: "#718078", fontSize: 12, marginTop: 12, fontStyle: "italic" },
  sharedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeManage: { backgroundColor: "#E6EFE7" },
  badgeView: { backgroundColor: "#F1F5EF" },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#285C3B" },
  removeBtn: { padding: 8, backgroundColor: "#FFF7F7", borderRadius: 8, borderWidth: 1, borderColor: "#F5DADA" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addText: { color: "#285C3B", fontWeight: "700", fontSize: 15 },
  expiryTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#976A00",
    marginTop: -14,
    marginBottom: 8,
  },
});