import { StyleSheet, Text, View } from "react-native";

export function CareCard({
  title,
  progress,
  next,
}: {
  title: string;
  progress: string;
  next: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>{progress}</Text>
      <View style={styles.bar}>
        <View style={styles.fill} />
      </View>
      <Text style={styles.next}>{next}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 24,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#17201B" },
  progress: { fontSize: 12, color: "#718078", marginTop: 5 },
  bar: {
    height: 7,
    backgroundColor: "#E8ECE8",
    borderRadius: 5,
    marginTop: 12,
  },
  fill: {
    width: "60%",
    height: 7,
    backgroundColor: "#4C8059",
    borderRadius: 5,
  },
  next: { fontSize: 13, color: "#52615A", marginTop: 12 },
});
