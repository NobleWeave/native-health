import React, { useState } from "react";
import { 
  StyleSheet, Text, View, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { ProviderCard } from "../components/ProviderCard";
import { findAndRankCare, RankedProvider } from "../services/navigator";

export default function FindCareScreen() {
  const [speciality, setSpeciality] = useState("Orthopaedics");
  const [maxCost, setMaxCost] = useState("500");
  const [maxDistance, setMaxDistance] = useState("10");
  const [language, setLanguage] = useState("Bengali");
  const [scheme, setScheme] = useState("PM-JAY");

  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [results, setResults] = useState<RankedProvider[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setLocationStatus("Acquiring location...");
    
    let userLat = 23.83; // Fallback latitude
    let userLng = 91.28; // Fallback longitude

    try {
      // 1. Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied", 
          "CareFlow needs location access to find nearby providers. Using default location."
        );
      } else {
        // 2. Fetch current coordinates
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        userLat = location.coords.latitude;
        userLng = location.coords.longitude;
      }
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Location Error", "Could not fetch current location. Using default.");
    }

    setLocationStatus("Searching providers...");

    // 3. Execute search with real coordinates
    const constraints = {
      speciality: speciality.trim(),
      maxCost: parseInt(maxCost) || 1000,
      maxDistance: parseInt(maxDistance) || 20,
      language: language.trim(),
      scheme: scheme.trim(),
      location: { lat: userLat, lng: userLng },
    };

    const providers = await findAndRankCare(constraints);
    setResults(providers);
    setLoading(false);
    setLocationStatus("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <Text style={styles.title}>Find care</Text>
            <Text style={styles.sub}>Matched to your needs, budget, and constraints.</Text>
          </View>

          {/* Search Constraints Form */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Speciality</Text>
                <TextInput style={styles.input} value={speciality} onChangeText={setSpeciality} placeholder="e.g. Orthopaedics" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Max Cost (₹)</Text>
                <TextInput style={styles.input} value={maxCost} onChangeText={setMaxCost} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Distance (km)</Text>
                <TextInput style={styles.input} value={maxDistance} onChangeText={setMaxDistance} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Language</Text>
                <TextInput style={styles.input} value={language} onChangeText={setLanguage} placeholder="e.g. Bengali" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Health Scheme</Text>
              <TextInput style={styles.input} value={scheme} onChangeText={setScheme} placeholder="e.g. PM-JAY" />
            </View>

            <Pressable style={styles.searchButton} onPress={handleSearch} disabled={loading}>
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
                {results.length > 0 ? `Top Matches (${results.length})` : "No providers found"}
              </Text>
              
              {results.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  name={provider.name}
                  meta={`${provider.metaString} · ${(provider.score * 100).toFixed(0)}% Match`}
                  reason={provider.reasonsString || provider.speciality}
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
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#17201B", marginBottom: 16 },
});