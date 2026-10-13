
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  searchNutrition,
  getFoodDetails,
  type NutritionFood,
} from "../services/nutrition";
import {
  getPackagedFood,
  type PackagedFood,
} from "../services/barcodeNutrition";

const POPULAR = [
  { name: "Apple", emoji: "🍎" },
  { name: "Banana", emoji: "🍌" },
  { name: "Spinach", emoji: "🥬" },
  { name: "Carrot", emoji: "🥕" },
];

function nutrientText(
  item: { value: number; unit: string } | null,
) {
  if (!item) return "Not available";
  return `${item.value} ${item.unit}`.trim();
}

export default function DietaryNeedsScreen() {
  const { barcode } = useLocalSearchParams<{
    barcode?: string | string[];
  }>();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NutritionFood[]>([]);
  const [selectedFood, setSelectedFood] =
    useState<NutritionFood | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<PackagedFood | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(term = query) {
    const value = term.trim();

    if (!value) {
      setError("Enter a food name to search.");
      return;
    }

    setQuery(value);
    setSearched(true);
    setLoading(true);
    setError("");
    setResults([]);
    setSelectedFood(null);
    setSelectedProduct(null);

    try {
      const foods = await searchNutrition(value);
      setResults(foods);

      if (foods.length === 0) {
        setError("No matching foods found. Try another search.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not search nutrition data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openFood(food: NutritionFood) {
    setLoading(true);
    setError("");

    try {
      // Use the FDC_ID endpoint to retrieve the selected food's details.
      const details = await getFoodDetails(food.id);
      setSelectedFood(details);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load food details.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const code = Array.isArray(barcode) ? barcode[0] : barcode;
    if (!code) return;

    let cancelled = false;

    async function lookupBarcode() {
      setLoading(true);
      setError("");
      setSelectedProduct(null);
      setSelectedFood(null);
      setSearched(false);

      try {
        const product = await getPackagedFood(code!);
        if (!cancelled) setSelectedProduct(product);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not look up this barcode.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void lookupBarcode();

    return () => {
      cancelled = true;
    };
  }, [barcode]);

  function reset() {
    setQuery("");
    setResults([]);
    setSelectedFood(null);
    setSelectedProduct(null);
    setSearched(false);
    setError("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CARE FOR YOURSELF</Text>
            <Text style={styles.title}>Dietary Needs</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 25 }}>🥗</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Explore nutrition in fruits, vegetables and packaged foods.
        </Text>

        <View style={styles.searchBox}>
          <Text style={styles.searchSymbol}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search fruits, vegetables..."
            placeholderTextColor="#87918A"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
            autoCapitalize="none"
            accessibilityLabel="Search for a food"
          />

          {!!query && (
            <Pressable onPress={reset}>
              <Text style={styles.clearButton}>✕</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.searchButton}
            onPress={() => void handleSearch()}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>

          <Pressable
            style={styles.scanButton}
            onPress={() => router.push("/barcode-scanner")}
            accessibilityRole="button"
            accessibilityLabel="Scan product barcode"
          >
            <Text style={styles.scanIcon}>▥</Text>
          </Pressable>
        </View>

        <Text style={styles.scanHint}>
          ▦  Scan a packaged food barcode to find its nutrition.
        </Text>

        {!searched && !selectedFood && !selectedProduct && (
          <>
            <Text style={styles.sectionTitle}>Popular searches</Text>
            <View style={styles.popularGrid}>
              {POPULAR.map((item) => (
                <Pressable
                  key={item.name}
                  style={styles.popularCard}
                  onPress={() => void handleSearch(item.name)}
                >
                  <Text style={{ fontSize: 29 }}>{item.emoji}</Text>
                  <Text style={styles.popularName}>{item.name}</Text>
                  <Text style={styles.popularArrow}>↗</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.infoCard}>
              <Text style={{ fontSize: 22 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>
                  Make informed choices
                </Text>
                <Text style={styles.infoText}>
                  Compare calories, protein, carbohydrates, fat and fiber.
                </Text>
              </View>
            </View>
          </>
        )}

        {loading && (
          <View style={styles.message}>
            <ActivityIndicator size="large" color="#285C3B" />
            <Text style={styles.muted}>Loading nutrition data...</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 28 }}>🔎</Text>
            <Text style={styles.detailTitle}>Unable to load results</Text>
            <Text style={styles.muted}>{error}</Text>
          </View>
        )}

        {searched && !loading && !error &&
          !selectedFood && !selectedProduct && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Search results ({results.length})
              </Text>

              {results.map((food) => (
                <Pressable
                  key={food.id}
                  style={styles.foodCard}
                  onPress={() => void openFood(food)}
                >
                  <View style={styles.foodIcon}>
                    <Text style={{ fontSize: 24 }}>🥗</Text>
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodMeta}>
                      {food.category} · USDA
                    </Text>
                  </View>
                  <Text style={styles.calorieValue}>
                    {nutrientText(food.calories)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

        {selectedFood && (
          <View style={styles.section}>
            <Pressable onPress={() => setSelectedFood(null)}>
              <Text style={styles.backText}>‹ Back to results</Text>
            </Pressable>

            <View style={styles.detailCard}>
              <Text style={{ fontSize: 42 }}>🥗</Text>
              <Text style={styles.detailTitle}>{selectedFood.name}</Text>
              <Text style={styles.detailSubtitle}>
                USDA FoodData Central · FDC ID: {selectedFood.id}
              </Text>
              <View style={styles.calorieHero}>
                <Text style={styles.muted}>Energy</Text>
                <Text style={styles.calorieHeroValue}>
                  {nutrientText(selectedFood.calories)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Nutrition facts</Text>
            {[
              ["Protein", selectedFood.protein],
              ["Carbohydrates", selectedFood.carbohydrates],
              ["Total fat", selectedFood.fat],
              ["Dietary fiber", selectedFood.fiber],
            ].map(([label, value]) => (
              <View key={label as string} style={styles.nutrientRow}>
                <Text style={styles.nutrientName}>{label as string}</Text>
                <Text style={styles.nutrientValue}>
                  {nutrientText(
                    value as { value: number; unit: string } | null,
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}

        {selectedProduct && (
          <View style={styles.section}>
            <Pressable onPress={reset}>
              <Text style={styles.backText}>‹ Back to search</Text>
            </Pressable>

            <View style={styles.detailCard}>
              {selectedProduct.image ? (
                <Image
                  source={{ uri: selectedProduct.image }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ fontSize: 42 }}>📦</Text>
              )}

              <Text style={styles.detailTitle}>
                {selectedProduct.name}
              </Text>
              {!!selectedProduct.brand && (
                <Text style={styles.detailSubtitle}>
                  {selectedProduct.brand}
                </Text>
              )}
              <Text style={styles.detailSubtitle}>
                Barcode: {selectedProduct.barcode}
              </Text>

              <View style={styles.calorieHero}>
                <Text style={styles.muted}>Calories per 100 g</Text>
                <Text style={styles.calorieHeroValue}>
                  {selectedProduct.calories == null
                    ? "Not available"
                    : `${selectedProduct.calories} kcal`}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Nutrition facts</Text>
            {[
              ["Protein", selectedProduct.protein],
              ["Carbohydrates", selectedProduct.carbohydrates],
              ["Total fat", selectedProduct.fat],
              ["Dietary fiber", selectedProduct.fiber],
            ].map(([label, value]) => (
              <View key={label as string} style={styles.nutrientRow}>
                <Text style={styles.nutrientName}>{label as string}</Text>
                <Text style={styles.nutrientValue}>
                  {value == null ? "Not available" : `${value} g`}
                </Text>
              </View>
            ))}

            {!!selectedProduct.ingredients && (
              <View style={styles.infoCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Ingredients</Text>
                  <Text style={styles.infoText}>
                    {selectedProduct.ingredients}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          Nutrition data is for general awareness and is not a substitute
          for personalized medical advice. Data may be incomplete.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "800",
    color: "#718078",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#17201B",
    marginTop: 5,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#E6EFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#69736D",
    lineHeight: 21,
    marginBottom: 22,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDE4DD",
    padding: 5,
  },
  searchSymbol: { fontSize: 26, color: "#718078", paddingHorizontal: 7 },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 12,
    color: "#17201B",
    fontSize: 13,
  },
  clearButton: { color: "#718078", paddingHorizontal: 6 },
  searchButton: {
    backgroundColor: "#285C3B",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  searchButtonText: { color: "white", fontSize: 12, fontWeight: "700" },
  scanButton: {
    width: 42,
    height: 44,
    marginLeft: 4,
    borderRadius: 10,
    backgroundColor: "#E6EFE7",
    alignItems: "center",
    justifyContent: "center",
  },
  scanIcon: { color: "#285C3B", fontSize: 25, fontWeight: "700" },
  scanHint: {
    fontSize: 12,
    lineHeight: 18,
    color: "#69736D",
    marginTop: 12,
    marginBottom: 28,
  },
  section: { marginTop: 10 },
  sectionTitle: {
    color: "#17201B",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  popularCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    padding: 15,
    marginBottom: 12,
  },
  popularName: {
    color: "#17201B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },
  popularArrow: {
    position: "absolute",
    right: 14,
    top: 14,
    fontSize: 17,
    color: "#718078",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E6EFE7",
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    gap: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#285C3B" },
  infoText: {
    fontSize: 12,
    lineHeight: 19,
    color: "#52665A",
    marginTop: 5,
  },
  message: { alignItems: "center", padding: 28, gap: 12 },
  muted: { color: "#69736D", fontSize: 13, textAlign: "center" },
  foodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E8E4",
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  foodIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E7EFE8",
    alignItems: "center",
    justifyContent: "center",
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 13, fontWeight: "700", color: "#17201B" },
  foodMeta: { fontSize: 11, color: "#718078", marginTop: 5 },
  calorieValue: {
    fontSize: 12,
    color: "#285C3B",
    fontWeight: "800",
    maxWidth: 100,
  },
  emptyState: {
    alignItems: "center",
    padding: 26,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 12,
    gap: 8,
  },
  backText: { color: "#285C3B", fontWeight: "700", marginBottom: 14 },
  detailCard: {
    alignItems: "center",
    backgroundColor: "#E6EFE7",
    borderRadius: 18,
    padding: 22,
    marginBottom: 22,
  },
  productImage: { width: 140, height: 140, marginBottom: 10 },
  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17201B",
    textAlign: "center",
    marginTop: 10,
  },
  detailSubtitle: {
    fontSize: 12,
    color: "#52665A",
    marginTop: 7,
    textAlign: "center",
  },
  calorieHero: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  calorieHeroValue: {
    color: "#285C3B",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4,
  },
  nutrientRow: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nutrientName: { color: "#526058", fontSize: 13, flex: 1 },
  nutrientValue: {
    color: "#17201B",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  emptyEmoji: { fontSize: 28 },
  footer: {
    fontSize: 11,
    lineHeight: 17,
    color: "#87918A",
    textAlign: "center",
    marginTop: 28,
  },
});
