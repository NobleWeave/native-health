// services/availabilityModel.ts
import { supabase } from "./supabase/client";

/** Fetch all availability slots for a provider */
export async function fetchProviderAvailability(providerId: string) {
  const { data, error } = await supabase
    .from("provider_availability")
    .select("*")
    .eq("provider_id", providerId)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Add a new availability slot */
export async function addAvailabilitySlot(providerId: string, startTime: string, endTime: string) {
  const { data, error } = await supabase
    .from("provider_availability")
    .insert({
      provider_id: providerId,
      start_time: startTime,
      end_time: endTime,
      is_available: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Toggle the is_available flag on a slot */
export async function toggleSlotAvailability(slotId: string, currentStatus: boolean) {
  const { error } = await supabase
    .from("provider_availability")
    .update({ is_available: !currentStatus })
    .eq("id", slotId);

  if (error) throw error;
  return true;
}

/** Delete an availability slot */
export async function deleteAvailabilitySlot(slotId: string) {
  const { error } = await supabase
    .from("provider_availability")
    .delete()
    .eq("id", slotId);

  if (error) throw error;
  return true;
}
