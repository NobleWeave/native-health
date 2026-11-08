import React, { useState } from "react";
import { router } from "expo-router";
import { 
  StyleSheet, Text, View, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { createMission } from "../../services/missionEngine";

export default function CreateMissionScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please provide a title for the mission.");
      return;
    }

    setLoading(true);
    try {
      const newMission = await createMission(user.id, title.trim(), description.trim());
      // Replace the current screen in the stack with the new mission details
      router.replace(`/mission/${newMission.id}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not create mission.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Cancel</Text>
          </Pressable>

          <Text style={styles.title}>Start new mission</Text>
          <Text style={styles.sub}>
            Create a dedicated space to track an upcoming consultation, procedure, or care goal.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mission Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Father's Cardiology Checkup"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Briefly describe the goal..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create Mission</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    minHeight: 56, borderWidth: 1, borderColor: "#CBD5E1",
    borderRadius: 12, backgroundColor: "#FFFFFF",
    paddingHorizontal: 16, fontSize: 16, color: "#0F172A",
  },
  textArea: { minHeight: 100, paddingTop: 14, textAlignVertical: "top" },
  button: {
    height: 56, borderRadius: 14, backgroundColor: "#285C3B",
    alignItems: "center", justifyContent: "center", marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});