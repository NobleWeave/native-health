import { Link } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  href: "/find-care" | "/appointments" | "/documents" | "/(tabs)/care" | "/daily-log";
};

export function QuickAction({ icon, title, href }: QuickActionProps) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={18} color="#315C3E" />
        </View>
        <Text style={styles.title}>{title}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E7EFE8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { color: "#315C3E", fontSize: 18, fontWeight: "700" },
  title: { marginTop: 10, color: "#27312B", fontWeight: "600" },
});
