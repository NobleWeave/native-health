import { StyleSheet, Text, View } from "react-native";

export function MissionTask({
  text,
  done = false,
}: {
  text: string;
  done?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.check, done && styles.done]}>
        <Text style={styles.checkText}>{done ? "✓" : ""}</Text>
      </View>
      <Text style={[styles.text, done && styles.strike]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B9C4BC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  done: { backgroundColor: "#DCE8DF", borderColor: "#DCE8DF" },
  checkText: { color: "#315C3E", fontWeight: "700" },
  text: { color: "#27312B" },
  strike: { textDecorationLine: "line-through", color: "#89938D" },
});
