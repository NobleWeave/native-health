import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  href:
    | "/find-care"
    | "/appointments"
    | "/documents"
    | "/(tabs)/care"
    | "/dietary-needs"
    | "/daily-log"
    | "/ragassistant";
};

export function QuickAction({ icon, title, href }: QuickActionProps) {
  return (
    <Link href={href as Href} asChild>
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
    flex: 1,
    minHeight: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  cardPressed: {
    opacity: 0.75,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E7EFE8",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#315C3E",
    fontSize: 18,
    fontWeight: "700",
  },
  title: {
    marginTop: 10,
    color: "#27312B",
    fontWeight: "600",
    fontSize: 14,
  },
});
