import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    if (!login(email, password)) {
      setError("Invalid username or password. Use the demo credentials shown below.");
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.logo}>CareFlow</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue your healthcare journey.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Username / Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="demo@careflow.com"
            placeholderTextColor="#A0AAA4"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#A0AAA4"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
        </View>
      </View>

      <View>
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo credentials</Text>
          <Text style={styles.demoText}>Username: demo@careflow.com</Text>
          <Text style={styles.demoText}>Password: CareFlow123</Text>
        </View>

        <Pressable onPress={() => router.replace("/signup")}>
          <Text style={styles.switchText}>Don't have an account? Create one</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F6", padding: 24, paddingTop: 60, justifyContent: "space-between", paddingBottom: 30 },
  back: { color: "#285C3B", fontSize: 15, fontWeight: "700", marginBottom: 30 },
  logo: { color: "#285C3B", fontSize: 22, fontWeight: "800", marginBottom: 28 },
  title: { fontSize: 32, fontWeight: "800", color: "#17201B", marginBottom: 8 },
  subtitle: { color: "#69736D", fontSize: 15, lineHeight: 22 },
  form: { marginTop: 32, gap: 10 },
  label: { color: "#334039", fontSize: 14, fontWeight: "700", marginTop: 8 },
  input: { height: 54, backgroundColor: "white", borderWidth: 1, borderColor: "#D8DED9", borderRadius: 13, paddingHorizontal: 15, color: "#17201B", fontSize: 15 },
  error: { color: "#B42318", fontSize: 13, lineHeight: 19, marginTop: 4 },
  button: { height: 56, backgroundColor: "#285C3B", borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 12 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
  demoBox: { backgroundColor: "#EAF1EC", borderRadius: 14, padding: 14, marginBottom: 18 },
  demoTitle: { color: "#285C3B", fontWeight: "800", marginBottom: 5 },
  demoText: { color: "#526058", fontSize: 12, marginTop: 2 },
  switchText: { textAlign: "center", color: "#285C3B", fontWeight: "700", fontSize: 14 },
});
