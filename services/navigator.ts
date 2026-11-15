import { supabase } from "./supabase/client";

export interface SearchConstraints {
  speciality: string;
  maxCost: number;
  maxDistance: number;
  language: string;
  scheme: string;
  location: { lat: number; lng: number };
}

export interface RankedProvider {
  id: string;
  name: string;
  speciality: string;
  distance_km: number;
  consultation_fee: number;
  phone: string | null;
  score: number;
  metaString: string;
  reasonsString: string;
}

// Configurable weights as per architectural spec
const WEIGHTS = {
  medicalFit: 0.30,
  affordability: 0.20,
  availability: 0.15,
  distance: 0.15,
  insurance: 0.10,
  language: 0.05,
  accessibility: 0.05,
};

export async function findAndRankCare(constraints: SearchConstraints): Promise<RankedProvider[]> {
  const { data: providers, error } = await supabase.rpc("search_providers", {
    user_lat: constraints.location.lat,
    user_lng: constraints.location.lng,
    radius_km: constraints.maxDistance,
    target_speciality: constraints.speciality || null,
  });

  if (error || !providers) {
    console.error("Geospatial search failed:", error);
    return [];
  }

  // 2. Rank and generate explainability
  const ranked = providers.map((provider: any) => {
    let score = 0;
    const reasons: string[] = [];
    const meta: string[] = [`${Number(provider.distance_km).toFixed(1)} km`, `₹${provider.consultation_fee}`];

    // Medical Fit (30%) - Pre-filtered by SQL, but we grant the weight if it matches perfectly
    if (provider.speciality?.toLowerCase() === constraints.speciality.toLowerCase()) {
      score += WEIGHTS.medicalFit;
    }

    // Affordability (20%)
    if (provider.consultation_fee <= constraints.maxCost) {
      score += WEIGHTS.affordability;
      reasons.push(`Within budget`);
    } else {
      // Partial score for being slightly over budget
      const ratio = constraints.maxCost / provider.consultation_fee;
      score += WEIGHTS.affordability * Math.max(0, ratio);
    }

    // Distance (15%) - Inverse scaling (closer is better)
    const distanceScore = Math.max(0, 1 - (provider.distance_km / constraints.maxDistance));
    score += WEIGHTS.distance * distanceScore;
    if (provider.distance_km <= 5) reasons.push("Very close to you");

    // Insurance (10%)
    if (constraints.scheme && provider.insurance_schemes?.includes(constraints.scheme)) {
      score += WEIGHTS.insurance;
      meta.push(constraints.scheme);
      reasons.push(`Accepts ${constraints.scheme}`);
    }

    // Language (5%)
    if (constraints.language && provider.languages?.includes(constraints.language)) {
      score += WEIGHTS.language;
      reasons.push(`${constraints.language} speaking`);
    }

    // Accessibility (5%) - Assume base score if features exist
    if (provider.accessibility && provider.accessibility.length > 0) {
      score += WEIGHTS.accessibility;
      reasons.push("Accessible facility");
    }

    // Availability (15%) - Mocked for MVP (In production, join with provider_availability)
    score += WEIGHTS.availability; 
    reasons.push("Slots available soon");

    return {
      id: provider.id,
      name: provider.name,
      speciality: provider.speciality,
      distance_km: provider.distance_km,
      consultation_fee: provider.consultation_fee,
      phone: provider.phone || null,
      score,
      metaString: meta.join(" · "),
      reasonsString: reasons.slice(0, 2).join(" · ") // Keep UI clean with top 2 reasons
    };
  });

  // 3. Sort by final weighted score descending
  return ranked.sort((a, b) => b.score - a.score);
}