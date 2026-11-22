import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ProviderCard } from "../components/ProviderCard";
import { findAndRankCare, RankedProvider } from "../services/navigator";
import { useAuth } from "../context/AuthContext";

export default function FindCareScreen() {
  const { location } = useAuth();
  const [speciality, setSpeciality] = useState("Orthopaedics");
  const [maxCost, setMaxCost] = useState("500");
  const [maxDistance, setMaxDistance] = useState("10");
  const [language, setLanguage] = useState("Bengali");
  const [scheme, setScheme] = useState("PM-JAY");
  const [providerType, setProviderType] = useState("");
  const [accessibility, setAccessibility] = useState("");

  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [results, setResults] = useState<RankedProvider[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setLocationStatus("Searching providers...");

    const userLat = location?.lat || 23.83;
    const userLng = location?.lng || 91.28;

    const constraints = {
      speciality: speciality.trim(),
      maxCost: parseInt(maxCost, 10) || 1000,
      maxDistance: parseInt(maxDistance, 10) || 20,
      language: language.trim(),
      scheme: scheme.trim(),
      providerType: providerType.trim(),
      accessibility: accessibility.trim(),
      location: { lat: userLat, lng: userLng },
    };

    try {
      const providers = await findAndRankCare(constraints);
      setResults(providers);
    } finally {
      setLoading(false);
      setLocationStatus("");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
            <Text style={styles.title}>Find care</Text>
            <Text style={styles.sub}>
              Matched to your needs, budget, and constraints.
            </Text>
          </View>

          {/* Search Constraints Form */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Speciality</Text>
                <TextInput
                  style={styles.input}
                  value={speciality}
                  onChangeText={setSpeciality}
                  placeholder="e.g. Orthopaedics"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Max Cost (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={maxCost}
                  onChangeText={setMaxCost}
                  keyboardType="numeric"
                  placeholder="e.g. 500"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Distance (km)</Text>
                <TextInput
                  style={styles.input}
                  value={maxDistance}
                  onChangeText={setMaxDistance}
                  keyboardType="numeric"
                  placeholder="e.g. 10"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Language</Text>
                <TextInput
                  style={styles.input}
                  value={language}
                  onChangeText={setLanguage}
                  placeholder="e.g. Bengali"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Health Scheme</Text>
                <TextInput
                  style={styles.input}
                  value={scheme}
                  onChangeText={setScheme}
                  placeholder="e.g. PM-JAY"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Provider Type</Text>
                <TextInput
                  style={styles.input}
                  value={providerType}
                  onChangeText={setProviderType}
                  placeholder="Doctor, Clinic..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accessibility (Optional)</Text>
              <TextInput
                style={styles.input}
                value={accessibility}
                onChangeText={setAccessibility}
                placeholder="e.g. Wheelchair ramp, Elevator"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <Pressable
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.loadingText}>{locationStatus}</Text>
                </View>
              ) : (
                <Text style={styles.searchButtonText}>Search Providers</Text>
              )}
            </Pressable>
          </View>

          {/* Results Section */}
          {hasSearched && !loading && (
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>
                {results.length > 0
                  ? `Top Matches (${results.length})`
                  : "No providers found"}
              </Text>

              {results.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  name={provider.name}
                  meta={`${provider.metaString} · ${(provider.score * 100).toFixed(0)}% Match`}
                  reason={provider.reasonsString || provider.speciality}
                  onPress={() =>
                    router.push({
                      pathname: "/provider/[id]",
                      params: { id: provider.id },
                    })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  backButton: { marginBottom: 10 },
  backText: { color: "#285C3B", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: { color: "#718078", marginTop: 5 },

  card: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    marginBottom: 24,
    gap: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155" },
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

  searchButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#285C3B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  searchButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  resultsContainer: { marginTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 16,
  },
});