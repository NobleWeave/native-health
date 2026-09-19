import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProviderCard } from "../components/ProviderCard";

export default function FindCareScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Find care</Text>
        <Text style={styles.sub}>Matched to your needs and preferences.</Text>

        <ProviderCard
          name="City Orthopaedic Centre"
          meta="4.2 km · ₹400 · PM-JAY"
          reason="Available tomorrow · Bengali support"
        />

        <ProviderCard
          name="District Hospital"
          meta="7.1 km · Government"
          reason="Scheme eligible · Orthopaedics"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 5, marginBottom: 20 },
});
