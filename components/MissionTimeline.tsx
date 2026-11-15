import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type MissionEvent = {
  id: string;
  event_type: string;
  created_at: string;
  metadata: any;
  actor: { full_name: string } | { full_name: string }[] | null;
};

const EVENT_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  MISSION_CREATED: { icon: "flag-outline", color: "#315C3E", label: "Mission Created" },
  STATE_TRANSITION: { icon: "git-commit-outline", color: "#2563EB", label: "State Updated" },
  TASK_ADDED: { icon: "add-circle-outline", color: "#718078", label: "Task Added" },
  TASK_COMPLETED: { icon: "checkmark-done-outline", color: "#285C3B", label: "Task Completed" },
  PROVIDER_SELECTED: { icon: "medical-outline", color: "#D97706", label: "Provider Selected" },
  APPOINTMENT_BOOKED: { icon: "calendar-outline", color: "#059669", label: "Appointment Booked" },
};

export function MissionTimeline({ events }: { events: MissionEvent[] }) {
  if (!events || events.length === 0) {
    return <Text style={styles.emptyText}>No history available.</Text>;
  }

  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.event_type] || {
          icon: "time-outline",
          color: "#718078",
          label: event.event_type,
        };
        const isLast = index === events.length - 1;
        const date = new Date(event.created_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const actorName = Array.isArray(event.actor)
          ? event.actor[0]?.full_name
          : event.actor?.full_name;

        return (
          <View key={event.id} style={styles.eventRow}>
            {/* Timeline Line & Node */}
            <View style={styles.nodeContainer}>
              <View style={[styles.node, { backgroundColor: config.color }]}>
                <Ionicons name={config.icon} size={14} color="#FFF" />
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Event Details */}
            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Text style={styles.eventLabel}>{config.label}</Text>
                <Text style={styles.timeText}>{date}</Text>
              </View>

              <Text style={styles.actorText}>
                By {actorName || "System"}
              </Text>

              {/* Render Transition Details if available */}
              {event.event_type === "STATE_TRANSITION" && event.metadata?.from && (
                <View style={styles.metaBox}>
                  <Text style={styles.metaText}>
                    {event.metadata.from} ➔ {event.metadata.to}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E4E8E4",
  },
  emptyText: { color: "#718078", fontStyle: "italic", textAlign: "center" },
  eventRow: {
    flexDirection: "row",
    marginBottom: 0,
  },
  nodeContainer: {
    width: 30,
    alignItems: "center",
    marginRight: 12,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#E4E8E4",
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 24, // Spacing before the next item starts
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#17201B",
  },
  timeText: {
    fontSize: 12,
    color: "#8A948E",
  },
  actorText: {
    fontSize: 13,
    color: "#52665A",
    marginBottom: 6,
  },
  metaBox: {
    backgroundColor: "#F7F8F6",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    alignSelf: "flex-start",
  },
  metaText: {
    fontSize: 12,
    color: "#315C3E",
    fontWeight: "600",
  },
});