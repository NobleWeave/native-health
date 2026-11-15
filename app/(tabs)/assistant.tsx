import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AssistantScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Care Assistant</Text>
        <Text style={styles.sub}>
          Not a diagnosis. We help you navigate care.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.bot}>
          <Text style={styles.msg}>
            Hi! Tell me what you need help with. You can describe it naturally.
          </Text>
        </View>

        <View style={styles.user}>
          <Text style={styles.userMsg}>
            I need a doctor for my mother's knee pain.
          </Text>
        </View>
      </View>

      <View style={styles.composer}>
        <TextInput
          placeholder="Describe what you need..."
          style={styles.input}
        />
        <TouchableOpacity style={styles.send}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E8E4",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#17201B" },
  sub: { fontSize: 12, color: "#718078", marginTop: 4 },
  body: { flex: 1, padding: 20, gap: 12 },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    maxWidth: "82%",
  },
  msg: { color: "#27312B", lineHeight: 20 },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#DCE8DF",
    borderRadius: 16,
    padding: 14,
    maxWidth: "82%",
  },
  userMsg: { color: "#23452F", lineHeight: 20 },
  composer: {
    flexDirection: "row",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E4E8E4",
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    backgroundColor: "#F2F4F1",
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  send: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#285C3B",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "white", fontSize: 22, fontWeight: "700" },
});
