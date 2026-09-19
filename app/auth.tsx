import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AuthLandingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>CareFlow</Text>
        <Text style={styles.title}>Healthcare, organized around you.</Text>
        <Text style={styles.subtitle}>
          Find care, manage appointments, keep your health information organized,
          and stay on top of your healthcare journey.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/login")}>
          <Text style={styles.primaryText}>Login</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push("/signup")}>
          <Text style={styles.secondaryText}>Create an account</Text>
        </Pressable>

        <Text style={styles.demoHint}>
          Demo login: demo@careflow.com / CareFlow123
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F6", padding: 24, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center" },
  logo: { fontSize: 25, fontWeight: "800", color: "#285C3B", marginBottom: 32 },
  title: { fontSize: 36, lineHeight: 43, fontWeight: "800", color: "#17201B", marginBottom: 16 },
  subtitle: { fontSize: 16, lineHeight: 25, color: "#69736D", maxWidth: 370 },
  actions: { gap: 12, paddingBottom: 18 },
  primaryButton: { height: 56, borderRadius: 15, backgroundColor: "#285C3B", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  secondaryButton: { height: 54, borderRadius: 15, backgroundColor: "white", borderWidth: 1, borderColor: "#D8DED9", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#285C3B", fontSize: 16, fontWeight: "700" },
  demoHint: { textAlign: "center", color: "#8A948E", fontSize: 11, marginTop: 6 },
});
