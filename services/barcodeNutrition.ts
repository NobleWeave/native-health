
export type PackagedFood = {
  barcode: string;
  name: string;
  brand: string | null;
  image: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  ingredients: string | null;
};

export async function getPackagedFood(
  barcode: string,
): Promise<PackagedFood> {
  const code = barcode.trim();

  if (!/^\d{8,14}$/.test(code)) {
    throw new Error("Invalid barcode.");
  }

  const fields = [
    "code",
    "product_name",
    "brands",
    "image_front_url",
    "nutriments",
    "ingredients_text",
  ].join(",");

  const url =
    `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}.json` +
    `?fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "CareFlow/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Barcode lookup failed (${response.status}).`);
  }

  const data = await response.json();
  const product = data.product;

  if (!product) {
    throw new Error("Product not found in Open Food Facts.");
  }

  const n = product.nutriments ?? {};

  return {
    barcode: code,
    name: product.product_name || "Unknown product",
    brand: product.brands || null,
    image: product.image_front_url || null,
    calories: n["energy-kcal_100g"] ?? null,
    protein: n.proteins_100g ?? null,
    carbohydrates: n.carbohydrates_100g ?? null,
    fat: n.fat_100g ?? null,
    fiber: n.fiber_100g ?? null,
    ingredients: product.ingredients_text || null,
  };
}
