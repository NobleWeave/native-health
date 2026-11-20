// services/notifications.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { saveUserPushToken } from "./reminderModel";

export const REMINDER_CHANNEL_ID = "careflow-reminders";

// Ensure notifications still show banner + sound while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function isRunningInExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

export async function configureNotificationChannel(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "CareFlow Reminders",
      importance: Notifications.AndroidImportance.MAX,
    });
    return true;
  } catch (err) {
    console.warn(
      "Custom Android notification channel unavailable (using default):",
      err,
    );
    return false;
  }
}

/**
 * Requests notification permissions, configures the Android channel,
 * and saves the Expo Push Token when running on a physical device build.
 */
export async function registerForPushNotificationsAsync(
  userId: string,
): Promise<{ token: string | null; permissionGranted: boolean }> {
  await configureNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { token: null, permissionGranted: false };
  }

  // Remote Expo Push Tokens require a physical device + dev/standalone build on newer Android SDKs
  if (!Device.isDevice || (Platform.OS === "android" && isRunningInExpoGo())) {
    return { token: null, permissionGranted: true };
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    const token = tokenResponse.data;
    if (token) {
      await saveUserPushToken(userId, token, Platform.OS);
    }

    return { token: token || null, permissionGranted: true };
  } catch (err) {
    console.warn(
      "Remote push token unavailable (falling back to Realtime local alerts):",
      err,
    );
    return { token: null, permissionGranted: true };
  }
}

/**
 * Immediately displays a local system notification (used in Expo Go or when remote push isn't active).
 */
export async function presentLocalReminderNotification(
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data,
    },
    trigger: null,
  });
}