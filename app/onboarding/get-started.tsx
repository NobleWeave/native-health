import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function GetStartedScreen() {
  const { pendingSignup, finishOnboarding } = useAuth();
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const handleFinish = () => {
    finishOnboarding({
      age,
      bloodGroup,
      allergies,
      conditions,
      medications,
      emergencyContact,
    });

    router.replace("/(tabs)");
  };

  if (!pendingSignup) {
    router.replace("/auth");
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>CareFlow</Text>
      <Text style={styles.step}>GET STARTED · 1 OF 1</Text>
      <Text style={styles.title}>Let's set up your care profile</Text>
      <Text style={styles.subtitle}>
        Hi {pendingSignup.name.split(" ")[0]}. These details help us organize your healthcare journey.
        You can leave anything blank and update it later.
      </Text>

      <Section title="Basic information">
        <Field label="Age" value={age} onChangeText={setAge} placeholder="e.g. 21" keyboardType="numeric" />
        <Field label="Blood group (optional)" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" />
      </Section>

      <Section title="Medical information">
        <Field label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="Any known allergies" multiline />
        <Field label="Existing conditions" value={conditions} onChangeText={setConditions} placeholder="Conditions you want us to know about" multiline />
        <Field label="Current medications" value={medications} onChangeText={setMedications} placeholder="Medicines you currently take" multiline />
      </Section>

      <Section title="Emergency contact">
        <Field label="Phone number" value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Optional emergency contact" keyboardType="phone-pad" />
      </Section>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Privacy note</Text>
        <Text style={styles.noticeText}>
          This is currently stored only in the app session. Supabase storage and authentication will be connected later.
        </Text>
      </View>

      <Pressable style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>Finish & Go to Home</Text>
      </Pressable>

      <Pressable style={styles.skip} onPress={handleFinish}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0AAA4"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F6" },
  content: { padding: 24, paddingTop: 58, paddingBottom: 45 },
  logo: { color: "#285C3B", fontSize: 22, fontWeight: "800", marginBottom: 22 },
  step: { color: "#718078", fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 9 },
  title: { color: "#17201B", fontSize: 30, lineHeight: 37, fontWeight: "800" },
  subtitle: { color: "#69736D", fontSize: 15, lineHeight: 23, marginTop: 10 },
  section: { marginTop: 28 },
  sectionTitle: { color: "#17201B", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  field: { marginBottom: 13 },
  label: { color: "#334039", fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { minHeight: 52, backgroundColor: "white", borderWidth: 1, borderColor: "#D8DED9", borderRadius: 13, paddingHorizontal: 15, color: "#17201B", fontSize: 15 },
  multiline: { minHeight: 88, paddingTop: 13 },
  notice: { backgroundColor: "#EAF1EC", borderRadius: 14, padding: 15, marginTop: 12 },
  noticeTitle: { color: "#285C3B", fontWeight: "800", marginBottom: 5 },
  noticeText: { color: "#526058", fontSize: 12, lineHeight: 18 },
  button: { height: 56, borderRadius: 14, backgroundColor: "#285C3B", alignItems: "center", justifyContent: "center", marginTop: 22 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "800" },
  skip: { alignItems: "center", paddingVertical: 17 },
  skipText: { color: "#285C3B", fontSize: 14, fontWeight: "700" },
});
