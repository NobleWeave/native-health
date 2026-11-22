import { supabase } from "./supabase/client";

export interface SearchConstraints {
  speciality: string;
  maxCost: number;
  maxDistance: number;
  language: string;
  scheme: string;
  providerType?: string;
  accessibility?: string;
  location: { lat: number; lng: number };
}

export interface RankedProvider {
  id: string;
  name: string;
  provider_type: string | null;
  speciality: string;
  distance_km: number;
  consultation_fee: number;
  phone: string | null;
  availableSlotsCount: number;
  score: number;
  metaString: string;
  reasonsString: string;
}

// Configurable weights as per Section 5.3 / Table 5.1
const WEIGHTS = {
  medicalFit: 0.30,
  affordability: 0.20,
  availability: 0.15,
  distance: 0.15,
  insurance: 0.10,
  language: 0.05,
  accessibility: 0.05,
};

export async function findAndRankCare(
  constraints: SearchConstraints,
): Promise<RankedProvider[]> {
  // 1. Geospatial + speciality search via PostGIS RPC
  const { data: providers, error } = await supabase.rpc("search_providers", {
    user_lat: constraints.location.lat,
    user_lng: constraints.location.lng,
    radius_km: constraints.maxDistance,
    target_speciality: constraints.speciality?.trim() || null,
  });

  if (error || !providers || providers.length === 0) {
    if (error) console.error("Geospatial search failed:", error);
    return [];
  }

  const providerIds = providers.map((p: any) => p.id);
  const nowIso = new Date().toISOString();

  // 2. Fetch real upcoming availability + provider_type/accessibility metadata in parallel
  const [availabilityRes, detailsRes] = await Promise.all([
    supabase
      .from("provider_availability")
      .select("provider_id, start_time")
      .in("provider_id", providerIds)
      .eq("is_available", true)
      .gt("start_time", nowIso),

    supabase
      .from("providers")
      .select("id, provider_type, accessibility")
      .in("id", providerIds),
  ]);

  if (availabilityRes.error) {
    console.warn("Availability lookup failed:", availabilityRes.error);
  }
  if (detailsRes.error) {
    console.warn("Provider details lookup failed:", detailsRes.error);
  }

  const slotCountByProvider = new Map<string, number>();
  for (const slot of availabilityRes.data || []) {
    slotCountByProvider.set(
      slot.provider_id,
      (slotCountByProvider.get(slot.provider_id) || 0) + 1,
    );
  }

  const detailsByProvider = new Map<
    string,
    { provider_type: string | null; accessibility: string[] | null }
  >();
  for (const row of detailsRes.data || []) {
    detailsByProvider.set(row.id, {
      provider_type: row.provider_type ?? null,
      accessibility: row.accessibility ?? null,
    });
  }

  const targetSpeciality = (constraints.speciality || "").trim().toLowerCase();
  const targetScheme = (constraints.scheme || "").trim().toLowerCase();
  const targetLanguage = (constraints.language || "").trim().toLowerCase();
  const targetProviderType = (constraints.providerType || "")
    .trim()
    .toLowerCase();
  const targetAccessibility = (constraints.accessibility || "")
    .trim()
    .toLowerCase();

  // 3. Apply explicit provider_type filter when specified
  const filteredProviders = providers.filter((provider: any) => {
    if (!targetProviderType) return true;
    const extra = detailsByProvider.get(provider.id);
    const pType = (provider.provider_type ?? extra?.provider_type ?? "")
      .trim()
      .toLowerCase();
    return pType.includes(targetProviderType);
  });

  // 4. Rank and build explainability tags
  const ranked: RankedProvider[] = filteredProviders.map((provider: any) => {
    let score = 0;
    const reasons: string[] = [];

    const extra = detailsByProvider.get(provider.id);
    const providerType = provider.provider_type ?? extra?.provider_type ?? null;
    const accessibilityList: string[] =
      provider.accessibility ?? extra?.accessibility ?? [];
    const availableSlotsCount = slotCountByProvider.get(provider.id) || 0;

    const meta: string[] = [
      `${Number(provider.distance_km).toFixed(1)} km`,
      `₹${provider.consultation_fee}`,
    ];
    if (providerType) meta.unshift(providerType);

    // Medical Fit (30%)
    const providerSpeciality = (provider.speciality || "").trim().toLowerCase();
    if (
      !targetSpeciality ||
      providerSpeciality === targetSpeciality ||
      providerSpeciality.includes(targetSpeciality)
    ) {
      score += WEIGHTS.medicalFit;
    }

    // Affordability (20%)
    if (provider.consultation_fee <= constraints.maxCost) {
      score += WEIGHTS.affordability;
      reasons.push("Within budget");
    } else if (provider.consultation_fee > 0 && constraints.maxCost > 0) {
      const ratio = constraints.maxCost / provider.consultation_fee;
      score += WEIGHTS.affordability * Math.max(0, ratio);
    }

    // Real Availability (15%) — based on upcoming active slots in provider_availability
    if (availableSlotsCount > 0) {
      score += WEIGHTS.availability;
      reasons.push(
        `${availableSlotsCount} ${availableSlotsCount === 1 ? "slot" : "slots"} available`,
      );
    }

    // Distance (15%) — inverse scaling (closer is better)
    const distanceScore =
      constraints.maxDistance > 0
        ? Math.max(0, 1 - provider.distance_km / constraints.maxDistance)
        : 0;
    score += WEIGHTS.distance * distanceScore;
    if (provider.distance_km <= 5) reasons.push("Very close to you");

    // Insurance Scheme (10%) — case-insensitive match
    if (
      targetScheme &&
      provider.insurance_schemes?.some(
        (s: string) => s.trim().toLowerCase() === targetScheme,
      )
    ) {
      score += WEIGHTS.insurance;
      meta.push(constraints.scheme.trim());
      reasons.push(`Accepts ${constraints.scheme.trim()}`);
    }

    // Language (5%) — case-insensitive match
    if (
      targetLanguage &&
      provider.languages?.some(
        (l: string) => l.trim().toLowerCase() === targetLanguage,
      )
    ) {
      score += WEIGHTS.language;
      reasons.push(`${constraints.language.trim()} speaking`);
    }

    // Accessibility (5%) — matches requested feature or rewards any listed accessibility feature
    if (targetAccessibility) {
      const matchedFeature = accessibilityList.find((item: string) =>
        item.trim().toLowerCase().includes(targetAccessibility),
      );
      if (matchedFeature) {
        score += WEIGHTS.accessibility;
        reasons.push(matchedFeature.trim());
      }
    } else if (accessibilityList.length > 0) {
      score += WEIGHTS.accessibility;
      reasons.push("Accessible facility");
    }

    return {
      id: provider.id,
      name: provider.name,
      provider_type: providerType,
      speciality: provider.speciality,
      distance_km: provider.distance_km,
      consultation_fee: provider.consultation_fee,
      phone: provider.phone || null,
      availableSlotsCount,
      score,
      metaString: meta.join(" · "),
      reasonsString: reasons.slice(0, 3).join(" · "),
    };
  });

  // 5. Sort descending by weighted score
  return ranked.sort((a, b) => b.score - a.score);
}