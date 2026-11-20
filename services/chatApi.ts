import { supabase } from "./supabase/client";
import { processChatMessage, generateConversationTitle } from "./chatOrchestrator";

export async function sendMessageToAssistant(userId: string, conversationId: string, message: string, location: { lat: number; lng: number }) {
  const replyText = await processChatMessage(userId, conversationId, message, location);
  // console.log("Orchestrator reply:", replyText);
  return replyText;
}

// Fetch all previous conversations for the sidebar
export async function fetchUserConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Fetch past messages when switching to an older chat
export async function fetchConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Create a new conversation and auto-generate the title
export async function createNewConversation(userId: string, firstMessage: string) {
  const title = await generateConversationTitle(firstMessage);

  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ patient_id: userId, title })
    .select()
    .single();

  if (error) throw error;

  // Initialize conversation state in database
  await supabase.from("conversation_states").insert({ conversation_id: newConv.id });

  return newConv;
}

// Rename a conversation
export async function renameConversation(conversationId: string, newTitle: string) {
  const { data, error } = await supabase
    .from("conversations")
    .update({ title: newTitle.trim() })
    .eq("id", conversationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a conversation and its messages and conversation_states
export async function deleteConversation(conversationId: string) {
  // Delete related conversation_states and messages explicitly
  // (ensures full cleanup even if ON DELETE CASCADE is not set on foreign keys)
  const { error: stateError } = await supabase
    .from("conversation_states")
    .delete()
    .eq("conversation_id", conversationId);
  if (stateError) {
    console.warn("Failed to delete conversation_states:", stateError);
  }

  const { error: msgError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);
  if (msgError) {
    console.warn("Failed to delete messages:", msgError);
  }

  const { error: convError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (convError) throw convError;
  return true;
}

export async function setActiveMissionForConversation(conversationId: string, missionId: string) {
  const { error } = await supabase
    .from("conversation_states")
    .update({ active_mission_id: missionId })
    .eq("conversation_id", conversationId);

  if (error) throw error;
  return true;
}