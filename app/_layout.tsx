import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ReminderManager } from "../components/ReminderManager";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <ReminderManager />
    </AuthProvider>
  );
}
