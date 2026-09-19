import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SignupScreen() {
  const { startSignup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please complete all fields.");
      return;
    }

    startSignup(name, email);
    router.replace("/onboarding/get-started");
  };

  return (
    <View style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.logo}>CareFlow</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Tell us a little about yourself so we can personalize your care journey.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#A0AAA4"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#A0AAA4"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor="#A0AAA4"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => router.replace("/login")}>
        <Text style={styles.switchText}>Already have an account? Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F6", padding: 24, paddingTop: 60, justifyContent: "space-between", paddingBottom: 30 },
  back: { color: "#285C3B", fontSize: 15, fontWeight: "700", marginBottom: 30 },
  logo: { color: "#285C3B", fontSize: 22, fontWeight: "800", marginBottom: 28 },
  title: { fontSize: 31, fontWeight: "800", color: "#17201B", marginBottom: 8 },
  subtitle: { color: "#69736D", fontSize: 15, lineHeight: 22 },
  form: { marginTop: 28, gap: 10 },
  label: { color: "#334039", fontSize: 14, fontWeight: "700", marginTop: 7 },
  input: { height: 54, backgroundColor: "white", borderWidth: 1, borderColor: "#D8DED9", borderRadius: 13, paddingHorizontal: 15, color: "#17201B", fontSize: 15 },
  error: { color: "#B42318", fontSize: 13, marginTop: 4 },
  button: { height: 56, backgroundColor: "#285C3B", borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
  switchText: { textAlign: "center", color: "#285C3B", fontWeight: "700", fontSize: 14 },
});
