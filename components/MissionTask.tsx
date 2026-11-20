import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function MissionTask({
  text,
  done = false,
  onPress,
  assigneeName,
  onAssign,
  onSetReminder,
}: {
  text: string;
  done?: boolean;
  onPress?: () => void;
  assigneeName?: string | null;
  onAssign?: () => void;
  onSetReminder?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[styles.check, done && styles.done]}>
          <Text style={styles.checkText}>{done ? "✓" : ""}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.text, done && styles.strike]}>{text}</Text>
          {assigneeName && (
            <Text style={styles.assigneeText}>Assigned to: {assigneeName}</Text>
          )}
        </View>
      </Pressable>

      {(onSetReminder || onAssign) && (
        <View style={styles.actions}>
          {onSetReminder && (
            <Pressable
              style={styles.actionBtn}
              onPress={onSetReminder}
              accessibilityRole="button"
              accessibilityLabel={`Set reminder for ${text}`}
            >
              <Ionicons name="alarm-outline" size={16} color="#285C3B" />
            </Pressable>
          )}

          {onAssign && (
            <Pressable
              style={styles.actionBtn}
              onPress={onAssign}
              accessibilityRole="button"
              accessibilityLabel={`Delegate ${text}`}
            >
              <Ionicons
                name={assigneeName ? "swap-horizontal-outline" : "person-add-outline"}
                size={16}
                color="#285C3B"
              />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  textContainer: { flex: 1, justifyContent: "center" },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#B9C4BC",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  done: { backgroundColor: "#DCE8DF", borderColor: "#DCE8DF" },
  checkText: { color: "#315C3E", fontWeight: "700" },
  text: { color: "#27312B", fontSize: 15 },
  strike: { textDecorationLine: "line-through", color: "#89938D" },
  assigneeText: { fontSize: 11, color: "#718078", marginTop: 2, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 10 },
  actionBtn: { padding: 8, backgroundColor: "#E6EFE7", borderRadius: 8 },
});
