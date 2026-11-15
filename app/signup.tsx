import { router } from "expo-router";
import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase/client";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // -----------------------------
    // Validation
    // -----------------------------

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing information", "Please fill in all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    // Basic phone validation (simple check for digits and length)
    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(phone.trim())) {
      Alert.alert(
        "Invalid phone number",
        "Please enter a valid 10-digit phone number.",
      );
      return;
    }

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith("+91")) {
        formattedPhone = `+91${formattedPhone}`;
      }

      const assignedRole = isProvider ? "provider" : "patient";

      // Create Supabase Auth account
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: formattedPhone,
            role: assignedRole,
          },
        },
      });

      // Supabase signup error
      if (error) {
        console.error("Signup error:", error);

        const message = error.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("user already")
        ) {
          Alert.alert(
            "Email already exists",
            "An account with this email already exists. Please log in instead.",
            [
              {
                text: "Go to Login",
                onPress: () => {
                  router.replace("/login");
                },
              },
              {
                text: "Cancel",
                style: "cancel",
              },
            ],
          );
          return;
        }
        Alert.alert("Signup failed", error.message);
        return;
      }

      // Make sure user was created
      if (!data.user) {
        Alert.alert(
          "Signup failed",
          "Your account could not be created. Please try again.",
        );

        return;
      }

      console.log("Supabase account created:", data.user.id);

      // Continue onboarding
      if (isProvider) {
        router.replace({ pathname: "/onboarding/provider-setup" });
      } else {
        router.replace("/onboarding/get-started");
      }
    } catch (error) {
      console.error("Unexpected signup error:", error);
      Alert.alert("Signup failed", "Something went wrong. Please try again.");
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.logo}>CareFlow</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Start managing your healthcare journey with CareFlow.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password again"
              placeholderTextColor="#94A3B8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Provider Checkbox UI */}
          <Pressable
            style={styles.checkboxContainer}
            onPress={() => setIsProvider(!isProvider)}
            disabled={loading}
          >
            <View
              style={[styles.checkbox, isProvider && styles.checkboxChecked]}
            >
              {isProvider && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <View style={styles.checkboxTextContainer}>
              <Text style={styles.checkboxLabel}>
                I am a Healthcare Provider
              </Text>
              <Text style={styles.checkboxSubtext}>
                Select this if you are registering as a doctor, clinic, or
                hospital.
              </Text>
            </View>
          </Pressable>

          {/* Signup Button */}
          <Pressable
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Create account</Text>
            )}
          </Pressable>

          {/* Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Pressable
              onPress={() => router.replace("/login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </View>

        {/* Privacy */}
        <Text style={styles.privacyText}>
          By creating an account, you agree to use CareFlow for healthcare
          navigation and coordination. CareFlow does not provide medical
          diagnosis.
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
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 50,
  },

  header: {
    marginBottom: 36,
  },

  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 30,
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
  },

  form: {
    gap: 18,
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
    height: 56,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F172A",
  },

  signupButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.7,
  },

  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },

  loginText: {
    color: "#64748B",
    fontSize: 14,
  },

  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },

  privacyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 32,
  },

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkboxTextContainer: { flex: 1 },
  checkboxLabel: { fontSize: 15, fontWeight: "600", color: "#0F172A" },
  checkboxSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 18,
  },
});
