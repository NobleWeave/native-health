
const API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY;
const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

export type NutrientValue = {
  value: number;
  unit: string;
};

export type NutritionFood = {
  id: number;
  name: string;
  category: string;
  calories: NutrientValue | null;
  protein: NutrientValue | null;
  carbohydrates: NutrientValue | null;
  fat: NutrientValue | null;
  fiber: NutrientValue | null;
};

function makeUrl(path: string) {
  if (!API_KEY) {
    throw new Error("USDA API key is missing. Check your .env file.");
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  return url.toString();
}

function findNutrient(
  nutrients: any[] = [],
  names: string[],
): NutrientValue | null {
  const item = nutrients.find((n) =>
    names.includes(n.nutrientName ?? n.nutrient?.name),
  );

  const value = item?.value ?? item?.amount;
  const unit = item?.unitName ?? item?.nutrient?.unitName;

  if (typeof value !== "number") return null;

  return { value, unit: unit ?? "" };
}

function mapFood(food: any): NutritionFood {
  const nutrients = food.foodNutrients ?? [];

  return {
    id: food.fdcId,
    name: food.description ?? "Unknown food",
    category: food.foodCategory ?? "Food",
    calories: findNutrient(nutrients, ["Energy"]),
    protein: findNutrient(nutrients, ["Protein"]),
    carbohydrates: findNutrient(
      nutrients,
      ["Carbohydrate, by difference"],
    ),
    fat: findNutrient(nutrients, ["Total lipid (fat)"]),
    fiber: findNutrient(nutrients, ["Fiber, total dietary"]),
  };
}

// Search food names using USDA FoodData Central.
export async function searchNutrition(
  query: string,
): Promise<NutritionFood[]> {
  const response = await fetch(makeUrl("/foods/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query.trim(),
      pageSize: 10,
      dataType: ["Foundation", "SR Legacy"],
    }),
  });

  if (!response.ok) {
    throw new Error(`USDA search failed (${response.status}).`);
  }

  const data = await response.json();
  return (data.foods ?? []).map(mapFood);
}

// Fetch full nutrient details for one selected FDC ID.
export async function getFoodDetails(
  fdcId: number,
): Promise<NutritionFood> {
  const response = await fetch(
    makeUrl(`/food/${encodeURIComponent(String(fdcId))}`),
  );

  if (!response.ok) {
    throw new Error(`USDA food details failed (${response.status}).`);
  }

  const food = await response.json();
  return mapFood(food);
}
