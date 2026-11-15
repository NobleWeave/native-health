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
import { useAuth } from "@/context/AuthContext";
import { createPatientHealthProfile } from "@/services/profileModel";

export default function GetStartedScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    try {
      if (user) {
        setLoading(true);
        // Convert DD/MM/YYYY to YYYY-MM-DD for PostgreSQL DATE type
        let formattedDate = null;
        if (dateOfBirth) {
          const [day, month, year] = dateOfBirth.split("/");
          if (day && month && year) formattedDate = `${year}-${month}-${day}`;
        }

        await createPatientHealthProfile(user.id, {
          date_of_birth: formattedDate,
          blood_group: bloodGroup.trim() || null,
          allergies: allergies.trim() || null,
          conditions: conditions.trim() || null,
          medications: medications.trim() || null,
        });
        
        Alert.alert(
          "You're all set!",
          "Your healthcare profile has been prepared.",
          [
            {
              text: "Continue",
              onPress: () => router.replace("/(tabs)"),
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error saving health profile:", error);
      Alert.alert(
        "Setup Error",
        "There was an issue saving your health profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      if (user) {
        setLoading(true);
        await createPatientHealthProfile(user.id, {}); // Create a blank profile
        router.replace("/(tabs)");
      }

    } catch (error) {
      console.error("Error creating blank health profile:", error);
      Alert.alert(
        "Setup Error",
        "There was an issue creating your health profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Header */}

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

        {/* Step 1 */}

        {step === 1 && (
          <View>
            <Text style={styles.title}>Tell us about yourself</Text>

            <Text style={styles.subtitle}>
              This information helps us personalize your healthcare experience.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of birth</Text>

                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#94A3B8"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Blood group</Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g. O+, A+, B-"
                  placeholderTextColor="#94A3B8"
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2 */}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Your medical information</Text>

            <Text style={styles.subtitle}>
              You can provide information that may help organize your
              healthcare. Everything here is optional.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Allergies</Text>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List any known allergies"
                  placeholderTextColor="#94A3B8"
                  value={allergies}
                  onChangeText={setAllergies}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Existing conditions</Text>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="For example: diabetes, asthma, etc."
                  placeholderTextColor="#94A3B8"
                  value={conditions}
                  onChangeText={setConditions}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current medications</Text>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="List medicines you currently take"
                  placeholderTextColor="#94A3B8"
                  value={medications}
                  onChangeText={setMedications}
                  multiline
                />
              </View>
            </View>
          </View>
        )}

        {/* Actions */}

        <View style={styles.actions}>
          <Pressable 
            style={[styles.primaryButton, loading && { opacity: 0.7 }]} 
            onPress={handleNext}
            disabled={loading}
          >
            {loading && step === 2 ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step === 1 ? "Continue" : "Finish Setup"}
              </Text>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipText}>{loading && step === 1 ? "Skipping..." : "Skip for now"}</Text>
          </Pressable>
        </View>

        <Text style={styles.privacyText}>
          You control what information you provide.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 35,
  },

  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 24,
  },

  progressContainer: {
    flexDirection: "row",
    gap: 8,
  },

  progress: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#E2E8F0",
  },

  progressActive: {
    backgroundColor: "#2563EB",
  },

  stepText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
  },

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

  form: {
    gap: 20,
  },

  inputGroup: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

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

  textArea: {
    minHeight: 90,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  actions: {
    marginTop: 35,
    gap: 14,
  },

  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  skipButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  skipText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },

  privacyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 20,
  },
});
