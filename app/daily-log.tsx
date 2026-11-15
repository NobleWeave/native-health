import { ingestDailyLog } from "@/services/rag";
import { router } from "expo-router";
import { useState } from "react";
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

// Reusable 1-10 rating scale
const RatingScale = ({
  label,
  value,
  onChange,
  leftLabel = "Low",
  rightLabel = "High",
}: {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.ratingHeader}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.ratingValue}>
        {value !== null ? `${value}/10` : "Not selected"}
      </Text>
    </View>

    <View style={styles.ratingContainer}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
        <Pressable
          key={num}
          onPress={() => onChange(num)}
          style={[
            styles.ratingButton,
            value === num && styles.ratingButtonActive,
          ]}>
          <Text
            style={[
              styles.ratingButtonText,
              value === num && styles.ratingButtonTextActive,
            ]}>
            {num}
          </Text>
        </Pressable>
      ))}
    </View>

    <View style={styles.ratingLabels}>
      <Text style={styles.ratingHint}>{leftLabel}</Text>
      <Text style={styles.ratingHint}>{rightLabel}</Text>
    </View>
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
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");

  // Activity
  const [steps, setSteps] = useState("");
  const [exerciseMinutes, setExerciseMinutes] = useState("");

  // Wellness
  const [sleepHours, setSleepHours] = useState("");
  const [hydration, setHydration] = useState("");

  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [appetite, setAppetite] = useState<number | null>(null);

  // Clinical Context
  const [medsTaken, setMedsTaken] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const now = new Date();

      const toNumber = (value: string) =>
        value.trim() !== "" ? Number(value) : null;

      const dailyLogPayload = {
        metadata: {
          timestamp: now.toISOString(),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          recordType: "daily_health_log",
        },

        vitals: {
          bloodPressure:
            systolicBP || diastolicBP
              ? {
                  systolic: toNumber(systolicBP),
                  diastolic: toNumber(diastolicBP),
                  unit: "mmHg",
                }
              : null,
          bloodSugar: toNumber(bloodSugar),
          bloodSugarUnit: bloodSugar ? "mg/dL" : null,
          heartRate: toNumber(heartRate),
          heartRateUnit: heartRate ? "bpm" : null,
          temperature: toNumber(temperature),
          temperatureUnit: temperature ? "°F" : null,
          weight: toNumber(weight),
          weightUnit: weight ? "kg" : null,
          oxygenSaturation: toNumber(oxygenSaturation),
          oxygenSaturationUnit: oxygenSaturation ? "%" : null,
          respiratoryRate: toNumber(respiratoryRate),
          respiratoryRateUnit: respiratoryRate ? "breaths/min" : null,
        },

        activity: {
          steps: toNumber(steps),
          exerciseMinutes: toNumber(exerciseMinutes),
        },

        wellness: {
          sleepHours: toNumber(sleepHours),
          hydrationGlasses: toNumber(hydration),

          ratings: {
            sleepQuality,
            energyLevel,
            mood,
            stressLevel,
            painLevel,
            appetite,
          },

          ratingScale: "1-10",
        },

        adherence: {
          medicationsTaken: medsTaken || null,
        },

        context: {
          symptoms: symptoms.trim() || null,
          notes: notes.trim() || null,
        },
      };

      const result = await ingestDailyLog(dailyLogPayload);
      console.log(
        "Daily log indexed for RAG:",
        result.sourceId,
        result.chunkCount,
      );

      Alert.alert(
        "Log Saved",
        "Your health log has been saved and added to your searchable patient records.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Daily log RAG ingestion failed:", error);
      Alert.alert(
        "Could not save log",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Daily Health Log</Text>
            <Text style={styles.sub}>
              Track your vitals, activity, wellness and symptoms to power your
              personalized care insights.
            </Text>
          </View>

          {/* VITALS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Vitals</Text>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>BP Systolic (mmHg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="120"
                  placeholderTextColor="#94A3B8"
                  value={systolicBP}
                  onChangeText={setSystolicBP}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>BP Diastolic (mmHg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="80"
                  placeholderTextColor="#94A3B8"
                  value={diastolicBP}
                  onChangeText={setDiastolicBP}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Blood Sugar (mg/dL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="105"
                  placeholderTextColor="#94A3B8"
                  value={bloodSugar}
                  onChangeText={setBloodSugar}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Heart Rate (bpm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="72"
                  placeholderTextColor="#94A3B8"
                  value={heartRate}
                  onChangeText={setHeartRate}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Temperature (°F)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98.6"
                  placeholderTextColor="#94A3B8"
                  value={temperature}
                  onChangeText={setTemperature}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor="#94A3B8"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>SpO₂ (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98"
                  placeholderTextColor="#94A3B8"
                  value={oxygenSaturation}
                  onChangeText={setOxygenSaturation}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Respiratory Rate (/min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="16"
                  placeholderTextColor="#94A3B8"
                  value={respiratoryRate}
                  onChangeText={setRespiratoryRate}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ACTIVITY */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Physical Activity</Text>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Daily Steps</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 6500"
                  placeholderTextColor="#94A3B8"
                  value={steps}
                  onChangeText={setSteps}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Exercise (Minutes)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30"
                  placeholderTextColor="#94A3B8"
                  value={exerciseMinutes}
                  onChangeText={setExerciseMinutes}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* WELLNESS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Wellness & Lifestyle</Text>

            <View style={styles.row}>
              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Sleep (Hours)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="7.5"
                  placeholderTextColor="#94A3B8"
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroupFlex}>
                <Text style={styles.label}>Water (Glasses)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6"
                  placeholderTextColor="#94A3B8"
                  value={hydration}
                  onChangeText={setHydration}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.ratingDivider} />

            <RatingScale
              label="Sleep Quality"
              value={sleepQuality}
              onChange={setSleepQuality}
              leftLabel="Very poor"
              rightLabel="Excellent"
            />

            <RatingScale
              label="Energy Level"
              value={energyLevel}
              onChange={setEnergyLevel}
              leftLabel="Exhausted"
              rightLabel="Very energetic"
            />

            <RatingScale
              label="Mood"
              value={mood}
              onChange={setMood}
              leftLabel="Very bad"
              rightLabel="Very good"
            />

            <RatingScale
              label="Stress Level"
              value={stressLevel}
              onChange={setStressLevel}
              leftLabel="Relaxed"
              rightLabel="Extremely stressed"
            />

            <RatingScale
              label="Pain Level"
              value={painLevel}
              onChange={setPainLevel}
              leftLabel="No pain"
              rightLabel="Extreme pain"
            />

            <RatingScale
              label="Appetite"
              value={appetite}
              onChange={setAppetite}
              leftLabel="No appetite"
              rightLabel="Very strong"
            />
          </View>

          {/* MEDICATION ADHERENCE */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Medication Adherence</Text>

            <Text style={styles.label}>
              Did you take your medications today?
            </Text>

            <View style={styles.pillContainer}>
              {["Yes, all", "Some of them", "No"].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.pill,
                    medsTaken === option && styles.pillActive,
                  ]}
                  onPress={() => setMedsTaken(option)}>
                  <Text
                    style={[
                      styles.pillText,
                      medsTaken === option && styles.pillTextActive,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* SYMPTOMS AND NOTES */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Symptoms & Observations</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Symptoms</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe discomfort, dizziness, nausea, headaches..."
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
                placeholder="Diet changes, unusual events, other observations..."
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>

          <Pressable
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSaving}>
            <Text style={styles.submitButtonText}>
              {isSaving ? "Saving..." : "Save Daily Log"}
            </Text>
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
  safe: {
    flex: 1,
    backgroundColor: "#F7F8F6",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#17201B",
  },
  sub: {
    color: "#718078",
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 16,
    gap: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#17201B",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputGroupFlex: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    borderRadius: 12,
    backgroundColor: "#F7F8F6",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  // Rating scale
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#285C3B",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  ratingButton: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    backgroundColor: "#F7F8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonActive: {
    backgroundColor: "#285C3B",
    borderColor: "#285C3B",
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#718078",
  },
  ratingButtonTextActive: {
    color: "#FFFFFF",
  },
  ratingLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ratingHint: {
    fontSize: 11,
    color: "#94A3B8",
  },
  ratingDivider: {
    height: 1,
    backgroundColor: "#E4E8E4",
  },

  // Medication pills
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  pillText: {
    color: "#718078",
    fontWeight: "600",
    fontSize: 13,
  },
  pillTextActive: {
    color: "#FFFFFF",
  },

  // Buttons
  submitButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#285C3B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelButtonText: {
    color: "#718078",
    fontSize: 15,
    fontWeight: "600",
  },
});
