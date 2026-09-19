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

import { supabase } from "../services/supabase/client";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // -----------------------------
    // Validation
    // -----------------------------

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
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

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();

      // -----------------------------
      // Create Supabase Auth account
      // -----------------------------

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      // -----------------------------
      // Supabase signup error
      // -----------------------------

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

      // -----------------------------
      // Make sure user was created
      // -----------------------------

      if (!data.user) {
        Alert.alert(
          "Signup failed",
          "Your account could not be created. Please try again.",
        );

        return;
      }

      console.log("Supabase account created:", data.user.id);

      // -----------------------------
      // Profile creation temporarily
      // skipped because of RLS.
      //
      // We will handle this later using
      // a proper database trigger.
      // -----------------------------

      console.log("Profile creation skipped for now.");

      // -----------------------------
      // Continue onboarding
      // -----------------------------

      router.replace("/onboarding/get-started");
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
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

          {/* Signup Button */}

          <Pressable
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}>
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
              disabled={loading}>
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
});
