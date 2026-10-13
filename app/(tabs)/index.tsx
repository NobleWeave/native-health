import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CareCard } from "../../components/CareCard";
import { QuickAction } from "../../components/QuickAction";
import { CDCArticles } from "../../components/CDCArticles";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING</Text>
            <Text style={styles.title}>How can we help?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>
        </View>

        <Link href="/(tabs)/assistant" asChild>
          <View style={styles.chatBox}>
            <Text style={styles.chatTitle}>Talk to your care assistant</Text>
            <Text style={styles.chatSubtitle}>
              Describe what you need in your own words.
            </Text>
            <View style={styles.chatButton}>
              <Text style={styles.chatButtonText}>Start conversation →</Text>
            </View>
          </View>
        </Link>

        <Text style={styles.sectionTitle}>Quick actions</Text>

        <View style={styles.actions}>
          <QuickAction icon="⌕" title="Find care" href="/find-care" />
          <QuickAction icon="✓" title="My missions" href="/(tabs)/care" />
          <QuickAction icon="◷" title="Appointments" href="/appointments" />
          <QuickAction icon="+" title="Upload report" href="/documents" />
        </View>

        <Text style={styles.sectionTitle}>Active care mission</Text>

        <CareCard
          title="Mother's knee consultation"
          progress="3 of 5 tasks complete"
          next="Appointment tomorrow · 3:30 PM"
        />

        <Text style={styles.sectionTitle}>Today</Text>

        <View style={styles.listCard}>
          <Text style={styles.itemTitle}>Medication reminder</Text>
          <Text style={styles.itemText}>Evening medicine · 8:00 PM</Text>
        </View>
        {/* CDC Health & Wellness Articles */}
        <CDCArticles />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20, paddingBottom: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#718078",
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#17201B",
    marginTop: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCE8DF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#315C3E", fontWeight: "700" },
  chatBox: {
    backgroundColor: "#285C3B",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  chatTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  chatSubtitle: {
    color: "#DDEBE0",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 18,
  },
  chatButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5EF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatButtonText: { color: "#285C3B", fontWeight: "700" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  listCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#17201B" },
  itemText: { color: "#69736D", marginTop: 5 },
});
