import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase/client";

export default function ProviderSetupScreen() {
  const { user, location } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [providerType, setProviderType] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [consultationFee, setConsultationFee] = useState("");

  // Step 2
  const [address, setAddress] = useState("");
  const [languages, setLanguages] = useState("");
  const [insuranceSchemes, setInsuranceSchemes] = useState("");
  const [accessibility, setAccessibility] = useState("");

  const handleNext = async () => {
    if (step === 1) {
      if (!providerType.trim() || !speciality.trim()) {
        Alert.alert(
          "Missing Details",
          "Please provide your provider type and primary speciality.",
        );
        return;
      }
      setStep(2);
      return;
    }

    if (!user) return;

    try {
      setLoading(true);
      // Clean up arrays for PostgreSQL insertion
      const processedLanguages = languages
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const processedSchemes = insuranceSchemes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const processedAccessibility = accessibility
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase.from("providers").insert({
        profile_id: user.id,
        name: user.user_metadata?.full_name || "Healthcare Provider",
        phone: user.user_metadata?.phone || null,
        provider_type: providerType.trim(),
        speciality: speciality.trim(),
        consultation_fee: parseFloat(consultationFee) || 0,
        address: address.trim(),
        latitude: location?.lat || 23.83,
        longitude: location?.lng || 91.28,
        languages: processedLanguages,
        insurance_schemes: processedSchemes,
        accessibility: processedAccessibility,
        is_active: true,
      });

      if (error) throw error;

      Alert.alert(
        "Profile Prepared",
        "Your provider account is ready. You will now be visible to patients in the area.",
        [
          {
            text: "Go to Dashboard",
            onPress: () => router.replace("/(tabs)"),
          },
        ],
      );
    } catch (error: any) {
      console.error("Provider setup error:", error);
      Alert.alert(
        "Setup Error",
        error.message || "Could not save your details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase.from("providers").insert({
          profile_id: user.id,
          name: user.user_metadata?.full_name || "Healthcare Provider",
          phone: user.user_metadata?.phone || null,
          provider_type: "pending setup",
          speciality: "pending setup",
          consultation_fee: 0,
          is_active: true,
          address: "pending setup",
          latitude: location?.lat || 23.83,
          longitude: location?.lng || 91.28,
          languages: [],
          insurance_schemes: [],
          accessibility: [],
        });
        if (error) throw error;
        router.replace("/(tabs)");
        console.log("Blank provider profile created:", data);
      }
    } catch (error) {
      console.error("Error creating blank provider profile:", error);
      Alert.alert(
        "Setup Error",
        "There was an issue creating your provider profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>CareFlow</Text>

          <View style={styles.progressContainer}>
            <View
              style={[styles.progress, step >= 1 && styles.progressActive]}
            />
            <View
              style={[styles.progress, step >= 2 && styles.progressActive]}
            />
          </View>

          <Text style={styles.stepText}>Step {step} of 2</Text>
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.title}>Professional Details</Text>
            <Text style={styles.subtitle}>
              Set up your provider profile so patients can find and book your
              services.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Provider Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Doctor, Clinic, Hospital"
                  placeholderTextColor="#94A3B8"
                  value={providerType}
                  onChangeText={setProviderType}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Speciality</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Orthopaedics, Cardiology"
                  placeholderTextColor="#94A3B8"
                  value={speciality}
                  onChangeText={setSpeciality}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Consultation Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 500"
                  placeholderTextColor="#94A3B8"
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Practice & Accessibility</Text>
            <Text style={styles.subtitle}>
              Help CareFlow map you to the right patients based on their
              constraints.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Languages Spoken</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. English, Bengali, Hindi (comma separated)"
                  placeholderTextColor="#94A3B8"
                  value={languages}
                  onChangeText={setLanguages}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Accepted Health Schemes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. PM-JAY, CGHS (comma separated)"
                  placeholderTextColor="#94A3B8"
                  value={insuranceSchemes}
                  onChangeText={setInsuranceSchemes}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Accessibility Options</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Wheelchair ramp, Elevator (comma separated)"
                  placeholderTextColor="#94A3B8"
                  value={accessibility}
                  onChangeText={setAccessibility}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Clinic Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your full practice address"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading && step === 2 ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step === 1 ? "Continue" : "Complete Profile"}
              </Text>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipText}>
              {loading && step === 1 ? "Skipping..." : "Skip for now"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: { marginBottom: 35 },
  logo: { fontSize: 24, fontWeight: "700", color: "#2563EB", marginBottom: 24 },
  progressContainer: { flexDirection: "row", gap: 8 },
  progress: { flex: 1, height: 5, borderRadius: 5, backgroundColor: "#E2E8F0" },
  progressActive: { backgroundColor: "#2563EB" },
  stepText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    marginBottom: 30,
  },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: { minHeight: 90, paddingTop: 14, textAlignVertical: "top" },
  actions: { marginTop: 35, gap: 14 },
  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  skipButton: { height: 48, alignItems: "center", justifyContent: "center" },
  skipText: { color: "#64748B", fontSize: 14, fontWeight: "600" },
});
