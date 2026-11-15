import React, { useState } from "react";
import { router } from "expo-router";
import { 
  StyleSheet, Text, View, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth} from "../../context/AuthContext";
import { inviteCaregiver } from "../../services/careCircle";
import Ionicons from "@expo/vector-icons/Ionicons";

const RELATIONSHIPS = [
  { label: "Parent", value: "parent" },
  { label: "Child", value: "child" },
  { label: "Spouse", value: "spouse" },
  { label: "Sibling", value: "sibling" },
  { label: "Relative", value: "relative" },
  { label: "Friend", value: "friend" },
  { label: "Professional", value: "professional" },
  { label: "Other", value: "other" },
];

export default function InviteCaregiverScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);

  const handleInvite = async () => {
    if(!user) return;
    if (!email.trim() || !relationship) {
      Alert.alert("Missing Info", "Please provide both an email and relationship.");
      return;
    }

    setLoading(true);
    try {
      await inviteCaregiver(user.id, email.trim(), relationship);
      
      Alert.alert("Success", "Invitation sent successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not send invitation.");
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = RELATIONSHIPS.find(r => r.value === relationship)?.label;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={styles.title}>Invite Caregiver</Text>
          <Text style={styles.sub}>
            Send an invitation to a family member, friend, or professional to join your care circle.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Caregiver&apos;s Email</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Relationship to you</Text>
              <Pressable 
                style={styles.dropdownButton}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={[styles.dropdownText, !relationship && styles.placeholderText]}>
                  {relationship ? selectedLabel : "Select a relationship"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#718078" />
              </Pressable>
            </View>

            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleInvite}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "Sending..." : "Send Invitation"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isPickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Relationship</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </Pressable>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {RELATIONSHIPS.map((item) => (
                <Pressable
                  key={item.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setRelationship(item.value);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText, 
                    relationship === item.value && styles.modalOptionTextActive
                  ]}>
                    {item.label}
                  </Text>
                  {relationship === item.value && (
                    <Ionicons name="checkmark" size={24} color="#285C3B" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  backButton: { marginBottom: 20 },
  backText: { color: "#285C3B", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 6, marginBottom: 30, lineHeight: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    height: 56, borderWidth: 1, borderColor: "#CBD5E1",
    borderRadius: 12, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, fontSize: 16, color: "#0F172A",
  },
  button: {
    height: 56, borderRadius: 14, backgroundColor: "#285C3B",
    alignItems: "center", justifyContent: "center", marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  dropdownButton: {
    height: 56, borderWidth: 1, borderColor: "#CBD5E1",
    borderRadius: 12, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between"
  },
  dropdownText: { fontSize: 16, color: "#0F172A" },
  placeholderText: { color: "#94A3B8" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: "70%"
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9"
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalCloseText: { fontSize: 16, fontWeight: "600", color: "#285C3B" },
  modalOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F8FAFC"
  },
  modalOptionText: { fontSize: 16, color: "#334155", fontWeight: "500" },
  modalOptionTextActive: { color: "#285C3B", fontWeight: "700" },
});