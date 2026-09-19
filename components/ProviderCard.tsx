import { StyleSheet, Text, View } from "react-native";

export function ProviderCard({
  name,
  meta,
  reason,
}: {
  name: string;
  meta: string;
  reason: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.reason}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: "700", color: "#17201B" },
  meta: { color: "#718078", marginTop: 5 },
  reason: { color: "#315C3E", marginTop: 9, fontWeight: "600" },
});
