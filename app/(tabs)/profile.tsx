import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();

          if (error) {
            Alert.alert("Logout failed", error);
            return;
          }

          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>

          <View>
            <Text style={styles.name}>Sayan</Text>
            <Text style={styles.sub}>Patient account</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Care circle</Text>
          <Text style={styles.value}>2 caregivers</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Language</Text>
          <Text style={styles.value}>English</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Notifications</Text>
          <Text style={styles.value}>Enabled</Text>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
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
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 20,
  },

  profileCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 18,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCE8DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#315C3E",
    fontSize: 20,
    fontWeight: "700",
  },

  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17201B",
  },

  sub: {
    color: "#718078",
    marginTop: 4,
  },

  row: {
    backgroundColor: "white",
    padding: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0EE",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  label: {
    color: "#27312B",
    fontWeight: "600",
  },

  value: {
    color: "#718078",
  },

  logoutButton: {
    marginTop: 28,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2B8B8",
    backgroundColor: "#FFF7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#C0392B",
    fontSize: 16,
    fontWeight: "700",
  },
});
