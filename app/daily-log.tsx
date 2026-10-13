import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper component for qualitative selections
const SelectionPills = ({ 
  options, 
  selected, 
  onSelect 
}: { 
  options: string[], 
  selected: string, 
  onSelect: (val: string) => void 
}) => (
  <View style={styles.pillContainer}>
    {options.map((opt) => (
      <Pressable
        key={opt}
        style={[styles.pill, selected === opt && styles.pillActive]}
        onPress={() => onSelect(opt)}
      >
        <Text style={[styles.pillText, selected === opt && styles.pillTextActive]}>
          {opt}
        </Text>
      </Pressable>
    ))}
  </View>
);

export default function DailyLogScreen() {
  // Vitals
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");

  // Lifestyle & Wellness
  const [sleepHours, setSleepHours] = useState("");
  const [hydration, setHydration] = useState(""); // glasses of water
  const [energyLevel, setEnergyLevel] = useState("");
  const [painLevel, setPainLevel] = useState("");
  
  // Clinical Context
  const [medsTaken, setMedsTaken] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    const now = new Date();
    
    // Comprehensive JSON payload for RAG vector embedding
    const dailyLogPayload = {
      metadata: {
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
      },
      vitals: {
        bloodPressure: systolicBP || diastolicBP ? `${systolicBP}/${diastolicBP}` : null,
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : null,
        heartRate: heartRate ? parseInt(heartRate, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        weight: weight ? parseFloat(weight) : null,
      },
      wellness: {
        sleepHours: sleepHours ? parseFloat(sleepHours) : null,
        hydrationGlasses: hydration ? parseInt(hydration, 10) : null,
        energyLevel: energyLevel || null,
        painLevel: painLevel || null,
      },
      adherence: {
        medicationsTaken: medsTaken || null,
      },
      context: {
        symptoms: symptoms.trim() || null,
        notes: notes.trim() || null,
      }
    };

    console.log("=== DAILY HEALTH LOG PAYLOAD ===");
    console.log(JSON.stringify(dailyLogPayload, null, 2));
    console.log("================================");

    Alert.alert(
      "Log Saved", 
      "Your health log has been recorded successfully.",
      [{ text: "Done", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Daily Health Log</Text>
            <Text style={styles.sub}>
              Track your vitals, lifestyle, and symptoms to power your personalized care insights.
            </Text>
          </View>

          {/* SECTION: VITALS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Vitals</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>BP (Systolic)</Text>
                <TextInput style={styles.input} placeholder="120" placeholderTextColor="#94A3B8" value={systolicBP} onChangeText={setSystolicBP} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>BP (Diastolic)</Text>
                <TextInput style={styles.input} placeholder="80" placeholderTextColor="#94A3B8" value={diastolicBP} onChangeText={setDiastolicBP} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Blood Sugar (mg/dL)</Text>
                <TextInput style={styles.input} placeholder="e.g. 105" placeholderTextColor="#94A3B8" value={bloodSugar} onChangeText={setBloodSugar} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Heart Rate (bpm)</Text>
                <TextInput style={styles.input} placeholder="e.g. 72" placeholderTextColor="#94A3B8" value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Temperature (°F/°C)</Text>
                <TextInput style={styles.input} placeholder="98.6" placeholderTextColor="#94A3B8" value={temperature} onChangeText={setTemperature} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Weight (kg/lbs)</Text>
                <TextInput style={styles.input} placeholder="70" placeholderTextColor="#94A3B8" value={weight} onChangeText={setWeight} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* SECTION: WELLNESS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Wellness & Lifestyle</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Sleep (Hours)</Text>
                <TextInput style={styles.input} placeholder="e.g. 7.5" placeholderTextColor="#94A3B8" value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Hydration (Glasses)</Text>
                <TextInput style={styles.input} placeholder="e.g. 6" placeholderTextColor="#94A3B8" value={hydration} onChangeText={setHydration} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Energy Level</Text>
              <SelectionPills 
                options={["Low", "Normal", "High"]} 
                selected={energyLevel} 
                onSelect={setEnergyLevel} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pain Level</Text>
              <SelectionPills 
                options={["None", "Mild", "Moderate", "Severe"]} 
                selected={painLevel} 
                onSelect={setPainLevel} 
              />
            </View>
          </View>

          {/* SECTION: CONTEXT */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Context & Adherence</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Did you take your medications today?</Text>
              <SelectionPills 
                options={["Yes, all", "Some of them", "No"]} 
                selected={medsTaken} 
                onSelect={setMedsTaken} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Symptoms</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe any discomfort, dizziness, nausea..."
                placeholderTextColor="#94A3B8"
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any changes to your diet or daily routine?"
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Save Daily Log</Text>
          </Pressable>
          
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", lineHeight: 20, marginTop: 6 },
  
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 16,
    gap: 18, // Spacing between input groups inside the card
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#17201B" },
  
  row: { flexDirection: "row", gap: 12 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
  
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    borderRadius: 12,
    backgroundColor: "#F7F8F6", // Slight tint to offset white card
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  
  pillContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    backgroundColor: "#F7F8F6",
  },
  pillActive: {
    backgroundColor: "#285C3B",
    borderColor: "#285C3B",
  },
  pillText: { color: "#718078", fontWeight: "600", fontSize: 13 },
  pillTextActive: { color: "#FFFFFF" },

  submitButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#285C3B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelButtonText: { color: "#718078", fontSize: 15, fontWeight: "600" },
});