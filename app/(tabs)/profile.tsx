import React, { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  fetchPatientHealthProfile,
  upsertPatientHealthProfile,
  fetchCareCircleCount,
  fetchProviderProfile,
  updateProviderProfile,
} from "../../services/profileModel";
import {
  clearAllUserNotifications,
  deleteUserNotification,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from "../../services/reminderModel";
import {
  getPushOptInPreference,
  setPushOptInPreference,
} from "../../services/notifications";

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Common UI states
  const fullName = user?.user_metadata?.full_name || "User";
  const initial = fullName.charAt(0).toUpperCase();
  const phone = user?.user_metadata?.phone || "Not provided";

  // Patient states
  const [careCircleCount, setCareCircleCount] = useState<number>(0);
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");

  // Provider states
  const [providerType, setProviderType] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [fee, setFee] = useState("");
  const [address, setAddress] = useState("");
  const [languages, setLanguages] = useState("");
  const [schemes, setSchemes] = useState("");
  const [accessibility, setAccessibility] = useState("");

  // Alerts & Push Opt-in states
  const [pushOptIn, setPushOptIn] = useState(true);
  const [pushToggleBusy, setPushToggleBusy] = useState(false);
  const [alerts, setAlerts] = useState<UserNotification[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAlerts, setClearingAlerts] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;
      setLoading(true);

      try {
        if (role === "patient") {
          // Fetch Care Circle Count
          const count = await fetchCareCircleCount(user.id);
          setCareCircleCount(count);

          // Fetch Health Profile
          const healthData = await fetchPatientHealthProfile(user.id);

          if (healthData) {
            setDob(healthData.date_of_birth || "");
            setBloodGroup(healthData.blood_group || "");
            setAllergies(healthData.allergies || "");
            setConditions(healthData.conditions || "");
            setMedications(healthData.medications || "");
          }

        } else if (role === "provider") {
          // Fetch Provider Details
          const providerData = await fetchProviderProfile(user.id);

          if (providerData) {
            setProviderType(providerData.provider_type || "");
            setSpeciality(providerData.speciality || "");
            setFee(providerData.consultation_fee?.toString() || "");
            setAddress(providerData.address || "");
            setLanguages(providerData.languages?.join(", ") || "");
            setSchemes(providerData.insurance_schemes?.join(", ") || "");
            setAccessibility(providerData.accessibility?.join(", ") || "");
          }
        }
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user, role]);

  const loadAlertsAndPushPref = useCallback(async () => {
    if (!user) return;
    setAlertsLoading(true);
    try {
      const [pref, notifs] = await Promise.all([
        getPushOptInPreference(user.id),
        fetchUserNotifications(user.id, 20),
      ]);
      setPushOptIn(pref);
      setAlerts(notifs);
    } catch (err) {
      console.error("Failed to load profile alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadAlertsAndPushPref();
      }
    }, [loadAlertsAndPushPref, user]),
  );

  const handleTogglePush = async (nextValue: boolean) => {
    if (!user || pushToggleBusy) return;
    setPushToggleBusy(true);
    setPushOptIn(nextValue);

    try {
      const result = await setPushOptInPreference(user.id, nextValue);
      setPushOptIn(result.enabled);

      if (result.permissionDenied) {
        Alert.alert(
          "Permission Needed",
          "Notification permission is blocked on this device. Enable notifications in system settings to receive alerts.",
        );
      }
    } catch (err: any) {
      setPushOptIn(!nextValue);
      Alert.alert(
        "Could Not Update Setting",
        err?.message || "Please try again.",
      );
    } finally {
      setPushToggleBusy(false);
    }
  };

  const handleMarkAlertRead = async (notif: UserNotification) => {
    if (notif.read_at) return;
    try {
      const readAt = await markNotificationRead(notif.id);
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === notif.id ? { ...item, read_at: readAt } : item,
        ),
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleOpenAlert = async (notif: UserNotification) => {
    if (!notif.read_at) {
      void handleMarkAlertRead(notif);
    }
    if (notif.mission_id) {
      router.push(`/mission/${notif.mission_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);
    try {
      const readAt = await markAllNotificationsRead(user.id);
      setAlerts((prev) =>
        prev.map((item) =>
          item.read_at ? item : { ...item, read_at: readAt },
        ),
      );
    } catch (err) {
      Alert.alert("Error", "Could not mark alerts as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDeleteAlert = async (notificationId: string) => {
    if (deletingAlertId) return;
    setDeletingAlertId(notificationId);
    try {
      await deleteUserNotification(notificationId);
      setAlerts((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (err) {
      Alert.alert("Error", "Could not delete notification.");
    } finally {
      setDeletingAlertId(null);
    }
  };

  const handleClearAllAlerts = () => {
    if (!user || clearingAlerts || alerts.length === 0) return;

    Alert.alert(
      "Clear All Notifications",
      "Remove all notifications from your inbox?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setClearingAlerts(true);
            try {
              await clearAllUserNotifications(user.id);
              setAlerts([]);
              setShowAllAlerts(false);
            } catch (err) {
              Alert.alert("Error", "Could not clear notifications.");
            } finally {
              setClearingAlerts(false);
            }
          },
        },
      ],
    );
  };

  const INITIAL_VISIBLE_ALERTS = 3;
  const visibleAlerts = showAllAlerts
    ? alerts
    : alerts.slice(0, INITIAL_VISIBLE_ALERTS);

  const unreadCount = alerts.filter((a) => !a.read_at).length;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (role === "patient") {
        await upsertPatientHealthProfile(user.id, {
          date_of_birth: dob || null,
          blood_group: bloodGroup || null,
          allergies: allergies || null,
          conditions: conditions || null,
          medications: medications || null,
        });

      } else if (role === "provider") {
        const processedLangs = languages.split(",").map(s => s.trim()).filter(Boolean);
        const processedSchemes = schemes.split(",").map(s => s.trim()).filter(Boolean);
        const processedAccessibility = accessibility.split(",").map(s => s.trim()).filter(Boolean);

        await updateProviderProfile(user.id, {
          provider_type: providerType || null,
          speciality: speciality || null,
          consultation_fee: parseFloat(fee) || null,
          address: address || null,
          languages: processedLangs,
          insurance_schemes: processedSchemes,
          accessibility: processedAccessibility,
        });
      }

      setIsEditing(false);
      Alert.alert("Success", "Your profile has been updated.");
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert("Update Failed", err.message || "Could not save profile data.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert("Logout failed", error);
            return;
          }
          router.replace("/login");
        },
      },
    ]);
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.headerRow}>
            <Text style={styles.title}>Profile</Text>
            {isEditing ? (
              <View style={styles.actionRow}>
                <Pressable onPress={() => setIsEditing(false)} disabled={saving}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Core Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.sub}>{role === "provider" ? "Healthcare Provider" : "Patient Account"}</Text>
              <Text style={styles.subText}>{phone}</Text>
            </View>
          </View>

          {/* Conditional Rendering based on Role */}
          {role === "patient" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Information</Text>
              <View style={styles.cardGroup}>
                <ProfileField label="Date of Birth" value={dob} isEditing={isEditing} onChangeText={setDob} placeholder="YYYY-MM-DD" />
                <ProfileField label="Blood Group" value={bloodGroup} isEditing={isEditing} onChangeText={setBloodGroup} placeholder="e.g. O+, A-" />
                <ProfileField label="Allergies" value={allergies} isEditing={isEditing} onChangeText={setAllergies} placeholder="None" multiline />
                <ProfileField label="Conditions" value={conditions} isEditing={isEditing} onChangeText={setConditions} placeholder="None" multiline />
                <ProfileField label="Medications" value={medications} isEditing={isEditing} onChangeText={setMedications} placeholder="None" multiline noBorder />
              </View>

              {!isEditing && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Account Settings</Text>
                  <View style={styles.cardGroup}>
                    <View style={[styles.row, { borderBottomWidth: 0 }]}>
                      <Text style={styles.label}>Care circle</Text>
                      <Text style={styles.value}>{careCircleCount} {careCircleCount === 1 ? 'caregiver' : 'caregivers'}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {role === "provider" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Details</Text>
              <View style={styles.cardGroup}>
                <ProfileField label="Provider Type" value={providerType} isEditing={isEditing} onChangeText={setProviderType} placeholder="e.g. Doctor, Clinic" />
                <ProfileField label="Speciality" value={speciality} isEditing={isEditing} onChangeText={setSpeciality} placeholder="e.g. Cardiology" />
                <ProfileField label="Fee (₹)" value={fee} isEditing={isEditing} onChangeText={setFee} placeholder="e.g. 500" keyboardType="numeric" noBorder />
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Practice & Setup</Text>
              <View style={styles.cardGroup}>
                <ProfileField label="Address" value={address} isEditing={isEditing} onChangeText={setAddress} placeholder="Clinic location" multiline />
                <ProfileField label="Languages" value={languages} isEditing={isEditing} onChangeText={setLanguages} placeholder="Comma separated" />
                <ProfileField label="Accepted Schemes" value={schemes} isEditing={isEditing} onChangeText={setSchemes} placeholder="Comma separated" />
                <ProfileField label="Accessibility Options" value={accessibility} isEditing={isEditing} onChangeText={setAccessibility} placeholder="Comma separated" noBorder />
              </View>
            </View>
          )}

          {/* Push Notification Opt-In & Alert Inbox (Hidden while editing) */}
          {!isEditing && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                Notification Preferences
              </Text>
              <View style={styles.cardGroup}>
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.label}>Push Alerts</Text>
                    <Text style={styles.helperText}>
                      Receive task reminders and caregiver missed-task alerts on
                      this device.
                    </Text>
                  </View>
                  <Switch
                    value={pushOptIn}
                    onValueChange={(val) => void handleTogglePush(val)}
                    disabled={pushToggleBusy}
                    trackColor={{ false: "#D5DDD7", true: "#A8CBB3" }}
                    thumbColor={pushOptIn ? "#285C3B" : "#F4F5F4"}
                  />
                </View>
              </View>

              <View style={styles.alertsHeaderRow}>
                <View style={styles.alertsTitleGroup}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                    Care Alerts
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadPill}>
                      <Text style={styles.unreadPillText}>
                        {unreadCount} new
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.alertsHeaderActions}>
                  {unreadCount > 0 && (
                    <Pressable
                      onPress={() => void handleMarkAllRead()}
                      disabled={markingAll}
                    >
                      <Text style={styles.markAllText}>
                        {markingAll ? "Updating..." : "Mark read"}
                      </Text>
                    </Pressable>
                  )}

                  {alerts.length > 0 && (
                    <Pressable
                      onPress={handleClearAllAlerts}
                      disabled={clearingAlerts}
                    >
                      <Text style={styles.clearAllText}>
                        {clearingAlerts ? "Clearing..." : "Clear all"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.cardGroup}>
                {alertsLoading ? (
                  <View style={styles.alertsEmpty}>
                    <ActivityIndicator color="#285C3B" />
                  </View>
                ) : alerts.length === 0 ? (
                  <View style={styles.alertsEmpty}>
                    <Ionicons
                      name="notifications-off-outline"
                      size={22}
                      color="#8A948E"
                    />
                    <Text style={styles.alertsEmptyText}>
                      No alerts yet. Missed-task and reminder notifications will
                      appear here.
                    </Text>
                  </View>
                ) : (
                  <>
                    {visibleAlerts.map((notif, idx) => {
                      const isUnread = !notif.read_at;
                      const isLast =
                        idx === visibleAlerts.length - 1 &&
                        alerts.length <= INITIAL_VISIBLE_ALERTS;
                      const isDeleting = deletingAlertId === notif.id;
                      const ts = new Date(notif.sent_at || notif.created_at);
                      const timeLabel = Number.isNaN(ts.getTime())
                        ? ""
                        : `${ts.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })} · ${ts.toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}`;

                      return (
                        <Pressable
                          key={notif.id}
                          style={[
                            styles.alertItem,
                            isUnread && styles.alertItemUnread,
                            isLast && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => void handleOpenAlert(notif)}
                        >
                          <View style={styles.alertTopRow}>
                            <View style={styles.alertTitleWrap}>
                              {isUnread && <View style={styles.unreadDot} />}
                              <Text style={styles.alertTitle} numberOfLines={1}>
                                {notif.title}
                              </Text>
                            </View>
                            <Text style={styles.alertTime}>{timeLabel}</Text>
                          </View>

                          <Text style={styles.alertBody}>{notif.body}</Text>

                          <View style={styles.alertFooter}>
                            {notif.mission_id ? (
                              <Text style={styles.alertActionLink}>
                                Open mission ›
                              </Text>
                            ) : (
                              <View />
                            )}

                            <View style={styles.alertFooterRight}>
                              {isUnread ? (
                                <Pressable
                                  style={styles.markReadBtn}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    void handleMarkAlertRead(notif);
                                  }}
                                >
                                  <Text style={styles.markReadBtnText}>
                                    Mark read
                                  </Text>
                                </Pressable>
                              ) : (
                                <Text style={styles.readStamp}>Read</Text>
                              )}

                              <Pressable
                                style={styles.deleteAlertBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteAlert(notif.id);
                                }}
                                disabled={isDeleting}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                {isDeleting ? (
                                  <ActivityIndicator size="small" color="#C0392B" />
                                ) : (
                                  <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color="#C0392B"
                                  />
                                )}
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}

                    {alerts.length > INITIAL_VISIBLE_ALERTS && (
                      <Pressable
                        style={styles.expandAlertsBtn}
                        onPress={() => setShowAllAlerts((prev) => !prev)}
                      >
                        <Text style={styles.expandAlertsText}>
                          {showAllAlerts
                            ? "Show fewer alerts"
                            : `Show all ${alerts.length} alerts`}
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Logout (Hidden while editing for cleaner UI) */}
          {!isEditing && (
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusable component for displaying or editing a profile field
function ProfileField({ label, value, isEditing, onChangeText, placeholder, multiline, keyboardType, noBorder }: any) {
  return (
    <View style={[styles.row, noBorder && { borderBottomWidth: 0 }, isEditing && styles.rowEditing]}>
      <Text style={[styles.label, isEditing && styles.labelEditing]}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          keyboardType={keyboardType || "default"}
        />
      ) : (
        <Text style={[styles.value, !value && styles.valueEmpty]}>{value || placeholder}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  center: { justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  editButton: { backgroundColor: "#E6EFE7", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  editButtonText: { color: "#285C3B", fontWeight: "700", fontSize: 14 },
  cancelText: { color: "#718078", fontWeight: "600", fontSize: 15 },
  saveButton: { backgroundColor: "#285C3B", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, minWidth: 64, alignItems: "center" },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  profileCard: {
    backgroundColor: "white", borderRadius: 18, padding: 18, flexDirection: "row",
    alignItems: "center", borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 24,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#DCE8DF",
    alignItems: "center", justifyContent: "center", marginRight: 16,
  },
  avatarText: { color: "#315C3E", fontSize: 22, fontWeight: "700" },
  profileMeta: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: "#17201B" },
  sub: { color: "#285C3B", fontWeight: "600", fontSize: 13, marginTop: 4 },
  subText: { color: "#718078", fontSize: 13, marginTop: 2 },

  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#17201B", marginBottom: 12, marginLeft: 4 },
  cardGroup: {
    backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#E4E8E4", overflow: "hidden"
  },

  row: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#EEF0EE",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center"
  },
  rowEditing: { flexDirection: "column", alignItems: "flex-start", gap: 8, paddingVertical: 14 },

  label: { color: "#27312B", fontWeight: "600", fontSize: 14 },
  labelEditing: { color: "#718078", fontSize: 13 },
  value: { color: "#52615A", fontSize: 14, flexShrink: 1, textAlign: "right", maxWidth: "65%" },
  valueEmpty: { color: "#A0ACA5", fontStyle: "italic" },

  input: {
    width: "100%", backgroundColor: "#F7F8F6", borderWidth: 1, borderColor: "#E4E8E4",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#17201B"
  },
  inputMultiline: { minHeight: 70, paddingTop: 12, textAlignVertical: "top" },

  logoutButton: {
    marginTop: 36, height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#E2B8B8",
    backgroundColor: "#FFF7F7", alignItems: "center", justifyContent: "center",
  },
  logoutText: { color: "#C0392B", fontSize: 16, fontWeight: "700" },
  helperText: {
    color: "#718078",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  alertsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  alertsTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unreadPill: {
    backgroundColor: "#E6EFE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unreadPillText: {
    color: "#285C3B",
    fontSize: 11,
    fontWeight: "700",
  },
  markAllText: {
    color: "#285C3B",
    fontSize: 13,
    fontWeight: "700",
  },
  alertsEmpty: {
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  alertsEmptyText: {
    color: "#718078",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  alertItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0EE",
    backgroundColor: "#FFFFFF",
  },
  alertItemUnread: {
    backgroundColor: "#F5FAF6",
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  alertTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#285C3B",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17201B",
    flexShrink: 1,
  },
  alertTime: {
    fontSize: 11,
    color: "#8A948E",
  },
  alertBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#52615A",
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  alertActionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#285C3B",
  },
  markReadBtn: {
    backgroundColor: "#E6EFE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markReadBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#285C3B",
  },
  readStamp: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  alertsHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  clearAllText: {
    color: "#C0392B",
    fontSize: 13,
    fontWeight: "700",
  },
  alertFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteAlertBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#F5DADA",
  },
  expandAlertsBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFBF9",
  },
  expandAlertsText: {
    color: "#285C3B",
    fontSize: 13,
    fontWeight: "700",
  },
});