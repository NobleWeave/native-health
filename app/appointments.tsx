import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppointmentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Appointments</Text>

        <View style={styles.card}>
          <Text style={styles.name}>Orthopaedic consultation</Text>
          <Text style={styles.text}>Tomorrow · 3:30 PM</Text>
          <Text style={styles.text}>City Orthopaedic Centre</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  name: { fontSize: 17, fontWeight: "700", color: "#17201B" },
  text: { color: "#718078", marginTop: 7 },
});
