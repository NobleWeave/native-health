import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import {
  fetchPatientHealthProfile,
  upsertPatientHealthProfile,
  fetchCareCircleCount,
  fetchProviderProfile,
  updateProviderProfile,
} from "../../services/profileModel";

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
});