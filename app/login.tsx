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
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await signIn(email.trim().toLowerCase(), password);

      if (error) {
        Alert.alert("Login failed", error);
        return;
      }

      // Supabase session is now active.
      // Go directly to Home.
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert("Login failed", "Something went wrong. Please try again.");
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

          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Sign in to continue your healthcare journey.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Forgot Password */}
          <Pressable
            style={styles.forgotButton}
            onPress={() => {
              Alert.alert(
                "Forgot password",
                "Password reset will be connected to Supabase next.",
              );
            }}
            disabled={loading}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          {/* Login */}
          <Pressable
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </Pressable>

          {/* Signup */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>

            <Pressable
              onPress={() => router.push("/signup")}
              disabled={loading}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>

        {/* Privacy */}
        <Text style={styles.privacyText}>
          Your healthcare information is protected and remains under your
          control.
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
    marginBottom: 40,
  },

  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    lineHeight: 40,
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

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -4,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },

  loginButton: {
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

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },

  signupText: {
    color: "#64748B",
    fontSize: 14,
  },

  signupLink: {
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
