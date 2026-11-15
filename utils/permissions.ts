import { supabase } from "../services/supabase/client";

export interface ConsentRecord {
  id: string;
  patient_id: string;
  caregiver_id: string;
  mission_id?: string | null;
  permissions: Record<string, boolean>;
  expires_at?: string | null;
  revoked_at?: string | null;
}

export function canAccess(
  activeConsents: ConsentRecord[],
  resource: string,
  action: string,
  context?: { missionId?: string }
): boolean {
  const permissionKey = action.toLowerCase(); // e.g., "view_documents"

  return activeConsents.some((consent) => {
    // Check if consent is revoked or expired
    if (consent.revoked_at) return false;
    if (consent.expires_at && new Date(consent.expires_at) < new Date()) return false;
    
    // If mission-specific context is provided, ensure consent matches the mission
    if (context?.missionId && consent.mission_id && consent.mission_id !== context.missionId) {
      return false;
    }

    // Evaluate JSONB permission flag
    return consent.permissions[permissionKey] === true;
  });
}