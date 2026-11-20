import { Link, router, useFocusEffect } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CareCard } from "../../components/CareCard";
import { CDCArticles } from "../../components/CDCArticles";
import { QuickAction } from "../../components/QuickAction";
import { useAuth } from "../../context/AuthContext";
import { getActiveMissionsForUser } from "../../services/missionEngine";
import { getProviderIdByProfileId, getProviderDashboardStats } from "../../services/appointmentModel";

export default function HomeScreen() {
  const { user, role } = useAuth();

  const initial = user?.user_metadata?.full_name?.charAt(0).toUpperCase() || "U";
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  if (role === "provider") {
    return <ProviderHome initial={initial} firstName={firstName} userId={user?.id} />;
  }

  return <PatientHome initial={initial} firstName={firstName} userId={user?.id} />;
}

function PatientHome({ initial, firstName, userId }: { initial: string, firstName: string, userId: string | undefined }) {
  const [activeMission, setActiveMission] = useState<any | null>(null);
  const [loadingMission, setLoadingMission] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      getActiveMissionsForUser(userId)
        .then((data) => {
          if (cancelled) return;
          if (data && data.length > 0) {
            const trulyActive = data.find((m: any) => {
              const tasks = m.care_tasks || [];
              if (tasks.length === 0) return true;
              return !tasks.every((t: any) => t.status === "completed");
            });

            setActiveMission(trulyActive || null);
          } else {
            setActiveMission(null);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!cancelled) setLoadingMission(false);
        });

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const completedTasks =
    activeMission?.care_tasks?.filter((t: any) => t.status === "completed")
      .length || 0;
  const totalTasks = activeMission?.care_tasks?.length || 0;
  const nextTask =
    activeMission?.care_tasks?.find((t: any) => t.status !== "completed")
      ?.title || "No pending tasks";
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING, {firstName.toUpperCase()}</Text>
            <Text style={styles.title}>How can we help?</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <Link href="/(tabs)/assistant" asChild>
          <Pressable style={styles.chatBox}>
            <Text style={styles.chatTitle}>Talk to your care assistant</Text>

            <Text style={styles.chatSubtitle}>
              Describe what you need in your own words.
            </Text>

            <View style={styles.chatButton}>
              <Text style={styles.chatButtonText}>Start conversation →</Text>
            </View>
          </Pressable>
        </Link>

        <Text style={styles.sectionTitle}>Quick actions</Text>

        <View style={styles.actions}>
          <View style={styles.actionSlot}>
            <QuickAction
              icon="search-outline"
              title="Find care"
              href="/find-care"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="checkmark-done-outline"
              title="My missions"
              href="/(tabs)/care"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="calendar-outline"
              title="Appointments"
              href="/appointments"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="document-text-outline"
              title="Upload report"
              href="/documents"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="restaurant-outline"
              title="Dietary Needs"
              href="/dietary-needs"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="create-outline"
              title="Daily log"
              href="/daily-log"
            />
          </View>

          <View style={styles.actionSlot}>
            <QuickAction
              icon="chatbubble-ellipses-outline"
              title="Ask my health records"
              href="/ragassistant"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active care mission</Text>

        {loadingMission ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#285C3B" />
          </View>
        ) : activeMission ? (
          <CareCard
            title={activeMission.title}
            progress={`${completedTasks} of ${totalTasks} tasks complete`}
            progressRatio={totalTasks > 0 ? completedTasks / totalTasks : 0}
            next={`Next: ${nextTask}`}
            onPress={() => router.push(`/mission/${activeMission.id}`)}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active missions right now.</Text>
          </View>
        )}

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

function ProviderHome({ initial, firstName, userId }: { initial: string, firstName: string, userId: string | undefined }) {
  const [stats, setStats] = useState({ requests: 0, today: 0 });

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;

      async function loadStats() {
        try {
          const providerId = await getProviderIdByProfileId(userId!);
          if (!providerId || cancelled) return;
          const dashStats = await getProviderDashboardStats(providerId);
          if (!cancelled) setStats(dashStats);
        } catch (error) {
          console.error("Failed to load provider stats:", error);
        }
      }

      void loadStats();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PROVIDER DASHBOARD</Text>
            <Text style={styles.title}>Welcome, {firstName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <View style={styles.providerStatsRow}>
          <Pressable style={styles.statCard} onPress={() => router.push("/(tabs)/schedule" as any)}>
            <Text style={styles.statNumber}>{stats.requests}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={() => router.push("/(tabs)/schedule" as any)}>
            <Text style={styles.statNumber}>{stats.today}</Text>
            <Text style={styles.statLabel}>Patients Today</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Provider Actions</Text>
        <View style={styles.actions}>
          <View style={styles.actionSlot}>
             <Link href={"/(tabs)/schedule" as any} asChild>
               <Pressable style={styles.quickCard}>
                 <Text style={styles.quickIcon}>📅</Text>
                 <Text style={styles.quickTitle}>Manage Schedule</Text>
               </Pressable>
             </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F8F6",
  },

  container: {
    padding: 20,
    paddingBottom: 30,
  },

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

  avatarText: {
    color: "#315C3E",
    fontWeight: "700",
  },

  chatBox: {
    backgroundColor: "#285C3B",
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },

  chatTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },

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

  chatButtonText: {
    color: "#285C3B",
    fontWeight: "700",
  },

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
    alignItems: "stretch",
    marginBottom: 26,
  },

  actionSlot: {
    width: "48%",
    marginBottom: 12,
  },

  listCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17201B",
  },

  itemText: {
    color: "#69736D",
    marginTop: 5,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#718078",
    fontSize: 14,
  },
  providerStatsRow: { flexDirection: "row", gap: 14, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E4E8E4", alignItems: "center" },
  statNumber: { fontSize: 32, fontWeight: "800", color: "#285C3B" },
  statLabel: { fontSize: 13, fontWeight: "600", color: "#718078", marginTop: 6 },
  quickCard: { flex: 1, minHeight: 112, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E4E8E4" },
  quickIcon: { fontSize: 24, marginBottom: 10 },
  quickTitle: { color: "#27312B", fontWeight: "600", fontSize: 14 },
});
