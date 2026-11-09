import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getMissionDetails, transitionMission, getMissionEvents, MissionState, updateTaskStatus, addTaskToMission } from "../../services/missionEngine";
import { getActiveCaregivers, getMissionConsents, grantConsent, revokeMissionConsent } from "../../services/careCircle";
import { assignTask, unassignTask } from "../../services/tasks";
import { canAccess } from "../../utils/permissions";
import { MissionTask } from "../../components/MissionTask";
import { MissionTimeline, MissionEvent } from "../../components/MissionTimeline";

const STATE_LABELS: Record<MissionState, string> = {
  created: "Mission Created", care_identified: "Care Identified", provider_selected: "Provider Selected",
  appointment_booked: "Appointment Booked", consultation: "Consultation Phase", follow_up: "Follow-up",
  completed: "Completed", cancelled: "Cancelled"
};

export default function MissionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  
  const [mission, setMission] = useState<any>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isPatient, setIsPatient] = useState(false);
  const [canManage, setCanManage] = useState(false);

  // UI States
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [assigningTask, setAssigningTask] = useState<{id: string, title: string, assignee: string | null} | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const loadMissionData = useCallback(async () => {
    try {
      const [missionData, eventsData, consentsData] = await Promise.all([
        getMissionDetails(id), 
        getMissionEvents(id),
        getMissionConsents(id)
      ]);
      // console.log("Events for mission:", eventsData);
      setMission(missionData);
      setEvents(eventsData);
      setConsents(consentsData);

      // Determine RBAC permissions
      const patientCheck = user!.id === missionData.patient_id;
      setIsPatient(patientCheck);

      if (patientCheck) {
        setCanManage(true);
        // Patients need the caregiver list to share missions / assign tasks
        const cgData = await getActiveCaregivers(user!.id);
        // console.log("Active caregivers for patient:", cgData);
        setCaregivers(cgData || []);
      } else {
        // Find the caregiver's consent record for this mission
        const myConsent = consentsData.find((c: any) => c.caregiver.id === user!.id);
        if (myConsent) {
          // Use the utility to evaluate JSONB
          console.log("My consent for this mission:", myConsent);
          const hasManageAccess = canAccess([myConsent], "mission", "manage", { missionId: id });
          console.log(`Manage access for caregiver ${user!.id}:`, hasManageAccess);
          setCanManage(hasManageAccess);
        } else {
           setCanManage(false);
        }
      }

    } catch (error) {
      Alert.alert("Error", "Could not load mission details.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (id && user) {
      // Data loading synchronizes the screen with Supabase after route/auth changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMissionData();
    }
  }, [id, loadMissionData, user]);

  const handleShareMission = async (caregiverId: string, level: "view" | "manage") => {
    try {
      console.log(`Sharing mission ${mission.id} with caregiver ${caregiverId} at level ${level}`);
      const permissions = { view: true, manage: level === "manage" };
      await grantConsent(mission.patient_id, caregiverId, permissions, mission.id);
      Alert.alert("Success", "Mission shared successfully.");
      setShowSharePanel(false);
      loadMissionData();
    } catch (error) {
      Alert.alert("Error", "Could not share mission.");
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (!canManage) return Alert.alert("Restricted", "You only have view access for this mission.");
    
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
        await updateTaskStatus(taskId, mission.id, newStatus, user!.id);
        await loadMissionData();
    } catch (error) {
        Alert.alert("Error", "Could not update task.");
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await addTaskToMission(mission.id, newTaskTitle.trim(), user!.id);
      setNewTaskTitle("");
      setIsAddingTask(false);
      loadMissionData();
    } catch (error) {
      Alert.alert("Error", "Failed to add task.");
    }
  };

  const handleConfirmAssignment = async (caregiverId: string) => {
    if (!assigningTask || !user || !mission) return;
    try {
      await assignTask(assigningTask.id, caregiverId, mission.id, user.id, assigningTask.title);
      setAssigningTask(null);
      await loadMissionData();
    } catch (error) {
      Alert.alert("Assignment Failed", "Could not delegate task.");
    }
  };

  const handleUnassignTask = async () => {
    if (!assigningTask || !mission) return;
    try {
      await unassignTask(assigningTask.id);
      setAssigningTask(null);
      await loadMissionData();
    } catch (error) {
      Alert.alert("Error", "Could not remove assignment.");
    }
  };

  const handleRevokeConsent = (caregiverId: string, name: string) => {
    Alert.alert(
      "Revoke Access", 
      `Remove ${name}'s access to this mission?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Revoke", 
          style: "destructive",
          onPress: async () => {
            try {
              await revokeMissionConsent(mission.patient_id, caregiverId, mission.id);
              loadMissionData();
            } catch (error) {
              Alert.alert("Error", "Could not revoke access.");
            }
          }
        }
      ]
    );
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
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ACTIVE MISSION</Text>
              <Text style={styles.title}>{mission?.title}</Text>
            </View>
            
            {/* Share Button (Only Patient) */}
            {isPatient && (
              <Pressable style={styles.shareBtn} onPress={() => setShowSharePanel(!showSharePanel)}>
                <Ionicons name="share-social-outline" size={18} color="#285C3B" />
                <Text style={styles.shareBtnText}>Share</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.sub}>{mission?.description}</Text>
          
          {!isPatient && (
             <View style={styles.roleBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#315C3E" />
                <Text style={styles.roleBannerText}>
                  You have {canManage ? "Manage" : "View-Only"} access to {mission.patient?.full_name}&apos;s mission.
                </Text>
             </View>
          )}
        </View>

        {/* Share Panel (Patient Only) */}
        {showSharePanel && isPatient && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Share Mission Access</Text>
            {caregivers.length === 0 ? (
              <Text style={styles.sub}>No caregivers in your circle.</Text>
            ) : (
              caregivers.map((cg) => {
                const existing = consents.find(c => c.caregiver.id === cg.caregiver.id);
                return (
                  <View key={cg.id} style={styles.cgOption}>
                    <Text style={styles.cgOptionText}>{cg.caregiver.full_name}, {cg.caregiver_id}</Text>
                    {existing ? (
                      /* NEW: Show current role and Revoke button */
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={styles.existingText}>{existing.permissions?.manage ? "Manager" : "Viewer"}</Text>
                        <Pressable 
                          style={styles.miniBtnDanger} 
                          onPress={() => handleRevokeConsent(cg.caregiver.id, cg.caregiver.full_name)}
                        >
                          <Text style={styles.miniBtnDangerText}>Revoke</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable style={styles.miniBtn} onPress={() => handleShareMission(cg.caregiver.id, "view")}>
                          <Text style={styles.miniBtnText}>Can View</Text>
                        </Pressable>
                        <Pressable style={styles.miniBtn} onPress={() => handleShareMission(cg.caregiver.id, "manage")}>
                          <Text style={styles.miniBtnText}>Can Manage</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </View>
        )}

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{STATE_LABELS[mission?.status as MissionState]}</Text>
        </View>

        {/* Task List */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Action Items</Text>
          {canManage && (
             <Pressable onPress={() => setIsAddingTask(!isAddingTask)}>
               <Text style={styles.addBtnText}>{isAddingTask ? "Cancel" : "+ Add Task"}</Text>
             </Pressable>
          )}
        </View>

        {/* Add Task Input */}
        {isAddingTask && canManage && (
          <View style={styles.addTaskRow}>
            <TextInput 
              style={styles.taskInput}
              placeholder="E.g., Call doctor's office..."
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />
            <Pressable style={styles.saveTaskBtn} onPress={handleAddTask}>
              <Ionicons name="checkmark" size={20} color="white" />
            </Pressable>
          </View>
        )}

        {/* Task Assignment Panel */}
        {assigningTask && canManage ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Delegate: {assigningTask.title}</Text>
            {caregivers.map((cg) => (
              <Pressable 
                key={cg.id} 
                style={styles.cgOption} 
                onPress={() => handleConfirmAssignment(cg.caregiver.id)}
              >
                <Ionicons name="person-circle-outline" size={24} color="#285C3B" />
                <Text style={styles.cgOptionText}>{cg.caregiver.full_name}</Text>
              </Pressable>
            ))}
            {assigningTask.assignee && isPatient ? (
              <Pressable 
                style={[styles.cancelBtn, { backgroundColor: "#FFF7F7", borderColor: "#F5DADA", borderWidth: 1, marginTop: 10 }]} 
                onPress={handleUnassignTask}
              >
                <Text style={[styles.cancelBtnText, { color: "#C0392B" }]}>Remove Assignment</Text>
              </Pressable>
            ) : null} 
            <Pressable style={styles.cancelBtn} onPress={() => setAssigningTask(null)}>
              <Text style={styles.cancelBtnText}>Cancel Assignment</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.taskCard}>
            {(!mission?.care_tasks || mission.care_tasks.length === 0) ? (
              <Text style={styles.emptyText}>No tasks added yet.</Text>
            ) : (
              mission?.care_tasks?.map((task: any) => {
                // To show who it's assigned to
                const assigneeName = task.assigned_to 
                  ? (task.assigned_to === user?.id ? "You" : "Caregiver") // Real name requires a JOIN in getMissionDetails
                  : null;
                
                return (
                  <MissionTask 
                    key={task.id} 
                    text={task.title} 
                    done={task.status === "completed"}
                    assigneeName={assigneeName}
                    onPress={canManage ? () => handleToggleTask(task.id, task.status) : undefined}
                    onAssign={canManage ? () => setAssigningTask({id: task.id, title: task.title, assignee: task.assigned_to}) : undefined}
                  />
                )
              })
            )}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Audit History</Text>
        <MissionTimeline events={events} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  center: { justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  backButton: { marginBottom: 20 },
  backText: { color: "#285C3B", fontSize: 15, fontWeight: "700" },
  header: { marginBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800", color: "#718078" },
  title: { fontSize: 28, fontWeight: "800", color: "#17201B", marginTop: 5 },
  sub: { color: "#69736D", fontSize: 14, lineHeight: 21 },
  
  shareBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E6EFE7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  shareBtnText: { color: "#285C3B", fontWeight: "700", fontSize: 13 },
  roleBanner: { flexDirection: "row", backgroundColor: "#DCE8DF", padding: 10, borderRadius: 8, marginTop: 12, alignItems: "center", gap: 6 },
  roleBannerText: { color: "#23452F", fontSize: 12, fontWeight: "600" },

  statusCard: { backgroundColor: "#E6EFE7", borderRadius: 18, padding: 20, marginBottom: 24 },
  statusLabel: { fontSize: 20, fontWeight: "800", color: "#17201B" },
  
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#17201B" },
  addBtnText: { color: "#285C3B", fontWeight: "700", fontSize: 14 },
  
  addTaskRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  taskInput: { flex: 1, height: 48, backgroundColor: "white", borderRadius: 12, borderWidth: 1, borderColor: "#E4E8E4", paddingHorizontal: 14 },
  saveTaskBtn: { width: 48, height: 48, backgroundColor: "#285C3B", borderRadius: 12, alignItems: "center", justifyContent: "center" },

  taskCard: { backgroundColor: "white", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#E4E8E4", marginTop: 10 },
  emptyText: { color: "#718078", fontStyle: "italic" },
  
  panel: { backgroundColor: "#FFF", padding: 20, borderRadius: 18, borderWidth: 2, borderColor: "#285C3B", marginBottom: 20, marginTop: 10 },
  panelTitle: { fontSize: 16, fontWeight: "700", color: "#17201B", marginBottom: 16 },
  cgOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E4E8E4" },
  cgOptionText: { fontSize: 15, fontWeight: "600", color: "#27312B", marginLeft: 8, flex: 1 },
  existingText: { fontSize: 12, color: "#718078", fontStyle: "italic" },
  miniBtn: { backgroundColor: "#F1F5EF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  miniBtnText: { fontSize: 11, fontWeight: "600", color: "#285C3B" },
  cancelBtn: { marginTop: 16, alignItems: "center", paddingVertical: 12, backgroundColor: "#F7F8F6", borderRadius: 10 },
  cancelBtnText: { color: "#718078", fontWeight: "700" },
  miniBtnDanger: { backgroundColor: "#FFF7F7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#F5DADA" },
  miniBtnDangerText: { fontSize: 11, fontWeight: "600", color: "#C0392B" },
});