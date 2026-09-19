import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MissionTask } from "../../components/MissionTask";

export default function CareScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Care missions</Text>
        <Text style={styles.sub}>Keep healthcare tasks moving.</Text>

        <View style={styles.card}>
          <Text style={styles.name}>Mother's knee consultation</Text>
          <Text style={styles.progress}>3 / 5 completed</Text>

          <MissionTask text="Find suitable provider" done />
          <MissionTask text="Confirm appointment" done />
          <MissionTask text="Prepare previous reports" done />
          <MissionTask text="Attend consultation" />
          <MissionTask text="Upload prescription" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 5, marginBottom: 20 },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  name: { fontSize: 17, fontWeight: "700", color: "#17201B" },
  progress: {
    fontSize: 12,
    color: "#718078",
    marginTop: 5,
    marginBottom: 14,
  },
});
