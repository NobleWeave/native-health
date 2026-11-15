# Nutrition and public-health content

## Nutrition search

[`dietary-needs.tsx`](../../app/dietary-needs.tsx) calls
[`nutrition.ts`](../../services/nutrition.ts) for USDA FoodData Central search
and food-detail requests. The client maps returned nutrients into display
values. `EXPO_PUBLIC_USDA_API_KEY` is bundled into the client.

## Barcode lookup

[`barcode-scanner.tsx`](../../app/barcode-scanner.tsx) uses Expo Camera to scan
a barcode and calls [`barcodeNutrition.ts`](../../services/barcodeNutrition.ts)
for an Open Food Facts lookup. Missing products and API failures are surfaced
to the screen.

## CDC content

[`CDCArticles`](../../components/CDCArticles.tsx) calls
[`cdc.ts`](../../services/cdc.ts) to load and normalize CDC media content,
then opens article URLs with the platform browser.

These are informational integrations. They do not write clinical records or
provide diagnosis, treatment, or personalized medical advice.
