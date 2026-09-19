import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DocumentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.sub}>
          Upload a prescription or report and turn it into care tasks.
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Take photo / upload</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: {
    color: "#718078",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#285C3B",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
});
