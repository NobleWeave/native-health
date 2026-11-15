// services/chatOrchestrator.ts
import { z } from "zod";
import { findAndRankCare } from "./navigator";
import { createMission, addTaskToMission, transitionMission } from "./missionEngine";
import { assignTask } from "./tasks";
import { fetchProviderAvailability, toggleSlotAvailability } from "./availabilityModel";
import { supabase } from "./supabase/client";

// --- 1. ZOD SCHEMA FOR MULTI-ACTION PARSING ---
const IntentSchema = z.object({
  intents: z.array(z.enum([
    "FIND_CARE", "CREATE_MISSION", "ADD_TASK", "HEALTH_QUESTION",
    "BOOK_APPOINTMENT", "DELEGATE_TASK", "PROCESS_DOCUMENT", "EVALUATE_FOOD"
  ])),
  entities: z.object({
    speciality: z.string().optional(),
    maxCost: z.number().optional(),
    scheme: z.string().optional(), // Captures PM-JAY, CGHS, etc.
    location: z.string().optional(),
    missionTitle: z.string().optional(),
    taskTitles: z.array(z.string()).optional(), // Captures multiple tasks at once
    providerId: z.string().optional(),
    caregiverName: z.string().optional(),
    appointmentTime: z.string().optional(),
  }).optional(),
});

// --- 2. SYSTEM PROMPTS (UPDATED FOR BEHAVIORAL FLOW) ---
const ROUTER_PROMPT = `You are the Intent Router for CareFlow.
Classify the user's message into one OR MORE intents and extract entities.
Merge new constraints with the current state context.

Valid Intents:
- FIND_CARE: Looking for providers, clinics, or specialists.
- CREATE_MISSION: Setting up a care goal or tracker.
- ADD_TASK: Adding to-do items to a mission.
- HEALTH_QUESTION: Medical, wellness, symptom, or dietary questions.
- BOOK_APPOINTMENT: User wants to view availability or schedule an appointment. If they select a specific time from the context, extract the corresponding ISO 8601 start time into 'appointmentTime'.
- DELEGATE_TASK: User asks a family member/friend (caregiver) to do something. Extract "caregiverName".
- PROCESS_DOCUMENT: User wants to extract tasks or a mission from an uploaded prescription/document.
- EVALUATE_FOOD: User asks if a scanned/specific food is healthy for them.

Critical Rules:
- If a user mentions any speciality (e.g., cardiology/cardiologist, orthopaedics), capture it in "speciality" (e.g. cardiology, orthopaedics).
- If a user mentions an insurance scheme (e.g., PM-JAY, CGHS), capture it in "scheme".
- If a user mentions any cost (e.g., within/under/below 1000), capture it in "maxCost".
- If a user asks to create a mission AND suggest tasks, include BOTH "CREATE_MISSION" and "ADD_TASK" in the intents array. Use the context to generate logical task steps (e.g., "Apply ice to knee", "Book orthopaedic appointment") and output them in the "taskTitles" array.
- If a user asks to delegate/assign any task and gives a name then capture it in "caregiverName"`;

const MEDICAL_PROMPT = `You are a healthcare educational assistant.
When a user mentions pain, discomfort, or a minor symptom (like knee pain), ALWAYS start by offering quick first-aid tips, safe home remedies, or observational trials.
Only after providing these tips should you advise them to consult a specialist (e.g., an orthopaedic doctor) if the pain persists.
If evaluating food, compare the food item strictly against the user's provided health conditions (e.g., sugar for diabetes).
Crucial Rule: Provide general educational information only. Do not diagnose, prescribe, or claim certainty.`;

const RESPONSE_PROMPT = `You are the CareFlow Assistant.
Combine the provided Medical Context (if any) and Backend Tool Results (if any) into a single, natural, and empathetic conversational reply.
Rule 1: NEVER invent or hallucinate providers. Rely ONLY on the Tool Result.
Rule 2: If a mission and tasks were created, enthusiastically confirm the mission title and the tasks added.
Rule 3: If a mission/task was delegated, confirm who it was assigned to.
Rule 4: If 'available_slots' are returned, clearly list the dates/times and ask the user to pick one.
Rule 5: Keep the tone helpful, empathetic, and scannable.`;

// --- 3. MAIN ORCHESTRATOR FUNCTION ---
export async function processChatMessage(
  userId: string,
  conversationId: string,
  userMessage: string,
  userLocation: {lat: number, lng: number}
) {

  // A. Save User Message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userMessage
  });

  // B. Load Conversation State & History
  const { data: stateData } = await supabase
    .from("conversation_states")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(6);

  const currentState = stateData || { care_context: {}, active_mission_id: null, selected_provider_id: null, summary: "" };
  const formattedHistory = history
    ? history.reverse().map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")
    : "";
  const backgroundSummary = currentState.summary ? `Background Summary of Patient:\n${currentState.summary}\n\n` : "";
  const conversationContext = `${backgroundSummary}Recent Conversation:\n${formattedHistory}\n\nCurrent User Query: ${userMessage}`;

  // C. Call LLM 1: The Router
  const routerResponseJson = await callLLM(ROUTER_PROMPT, JSON.stringify({
    context: conversationContext,
    currentState: currentState.care_context
  }), "json_object");
  console.log("Router response:", routerResponseJson);

  // D. Parse & Validate Intents
  const parsed = IntentSchema.parse(JSON.parse(routerResponseJson));
  const { intents, entities = {} } = parsed;
  console.log("Parsed Intents:", intents, "Entities:", entities);

  // E. Merge State Context
  let mergedContext = {...currentState.care_context, ...entities};
  await supabase.from("conversation_states").upsert({
    conversation_id: conversationId,
    care_context: mergedContext,
    updated_at: new Date().toISOString()
  });

  let actionResults: Record<string, any> = {};
  let medicalResult: string | null = null;
  let executedTools: string[] = [];
  let currentMissionId = currentState.active_mission_id;

  // Branch 1: Medical & Food Evaluation (Needs Health Profile)
  if (intents.includes("HEALTH_QUESTION") || intents.includes("EVALUATE_FOOD")) {
    let contextString = userMessage;
    if (intents.includes("EVALUATE_FOOD")) {
      const { data: healthProfile } = await supabase.from("patient_health_profiles").select("conditions, allergies").eq("patient_id", userId).single();
      contextString = `User Query: ${userMessage}\nUser Conditions: ${healthProfile?.conditions || 'None'}\nUser Allergies: ${healthProfile?.allergies || 'None'}`;
    }
    medicalResult = await callLLM(MEDICAL_PROMPT, contextString, "text");
  }

  // Execute Sequential Action Tools
  // Branch 2: Document Processing (Auto-Mission Creation)
  if (intents.includes("PROCESS_DOCUMENT")) {
    executedTools.push("readDocument");
    // Fetch latest processed document
    const { data: latestDoc } = await supabase.from("documents").select("extracted_text, document_type").eq("patient_id", userId).order("created_at", { ascending: false }).limit(1).single();

    if (latestDoc && latestDoc.extracted_text) {
      const docAnalysis = await callLLM(
        "Extract a short mission title and a JSON array of actionable task string titles from this medical document. Format: { title: string, tasks: string[] }",
        latestDoc.extracted_text,
        "json_object"
      );
      const parsedDoc = JSON.parse(docAnalysis);
      const mission = await createMission(userId, parsedDoc.title, "Auto-generated from document");
      currentMissionId = mission.id;

      const addedTasks = await Promise.all(parsedDoc.tasks.map((t: string) => addTaskToMission(currentMissionId!, t, userId)));
      actionResults.document_processed = { mission, tasks: addedTasks };
    } else {
      actionResults.document_processed = { error: "No recent document found." };
    }
  }

  // Branch 3: Standard Mission & Task Flow
  if (intents.includes("CREATE_MISSION") && !intents.includes("PROCESS_DOCUMENT")) {
    executedTools.push("createMission");
    const mission = await createMission(userId, entities.missionTitle || "Care Goal", "Created via Assistant");
    actionResults.mission = mission;
    currentMissionId = mission.id;
  }

  if (intents.includes("ADD_TASK") && !intents.includes("PROCESS_DOCUMENT")) {
    executedTools.push("addTask");
    if (!currentMissionId) {
      actionResults.tasks = { error: "No active mission to add tasks to. Please create one first." };
    } else {
      const tasksToCreate = entities.taskTitles && entities.taskTitles.length > 0
        ? entities.taskTitles
        : ["Follow up on care plan"];

      // Execute all task additions concurrently for the active mission
      const addedTasks = await Promise.all(
        tasksToCreate.map(title => addTaskToMission(currentMissionId!, title, userId))
      );
      actionResults.tasks = addedTasks;
    }
  }

  // Branch 4: Delegation
  if (intents.includes("DELEGATE_TASK") && entities.caregiverName && currentMissionId) {
    executedTools.push("delegateTask");
    // Find caregiver by name mapping
    const { data: cgList } = await supabase.from("caregivers").select("caregiver_id, caregiver:profiles!caregiver_id(full_name)").eq("patient_id", userId).eq("status", "active");
    const matchedCg = cgList?.find(cg => cg.caregiver?.[0]?.full_name?.toLowerCase().includes(entities.caregiverName!.toLowerCase()));

    if (matchedCg && actionResults.tasks?.length > 0) {
      const taskId = actionResults.tasks[0].id; // Delegate the first created task
      await assignTask(taskId, matchedCg.caregiver_id, currentMissionId, userId, actionResults.tasks[0].title);
      actionResults.delegation = `Task assigned to ${matchedCg.caregiver[0].full_name}`;
    }
  }

  // Branch 5: Navigation & Booking
  if (intents.includes("FIND_CARE")) {
    executedTools.push("searchProviders");
    const providers = await findAndRankCare({
      speciality: mergedContext.speciality || "General",
      maxCost: mergedContext.maxCost || 9999,
      maxDistance: 20,
      language: "",
      scheme: mergedContext.scheme || "", // Context injects the scheme here
      location: userLocation
    });
    console.log("Found Providers:", providers);
    actionResults.providers = providers;
    if (providers.length > 0) {
      await supabase.from("conversation_states").update({ selected_provider_id: providers[0].id }).eq("conversation_id", conversationId);
    }
  }

  if (intents.includes("BOOK_APPOINTMENT")) {
    const providerId = entities.providerId || currentState.selected_provider_id;

    if (providerId) {
      // 1. Fetch available slots for the provider
      const slots = await fetchProviderAvailability(providerId);
      const availableSlots = slots.filter((s: any) => s.is_available);
      // console.log(slots, availableSlots);

      if (entities.appointmentTime && currentMissionId) {
        // 2. User selected a specific time, confirm booking
        executedTools.push("confirmBooking");

        // Match user's requested time with database slots
        const targetTimeStr = entities.appointmentTime.substring(0, 19);

        const matchedSlot = availableSlots.find((s: any) => {
          // Extract the same 19 chars from the Supabase string
          // (ignores the trailing +00:00 or .000Z)
          const dbTimeStr = s.start_time.substring(0, 19);
          return dbTimeStr === targetTimeStr;
        });

        if (matchedSlot) {
          // Book the appointment
          const { data: apt } = await supabase.from("appointments").insert({
            mission_id: currentMissionId,
            patient_id: userId,
            provider_id: providerId,
            scheduled_at: matchedSlot.start_time,
            status: "scheduled"
          }).select().single();

          // Update mission status & mark slot unavailable
          await transitionMission(currentMissionId, "provider_selected", "appointment_booked", userId);
          await toggleSlotAvailability(matchedSlot.id, true); // true = currently available, flips to false

          actionResults.appointment = apt;
        } else {
          actionResults.appointment = {
            error: "That specific time slot is no longer available. Please choose from the available slots.",
            available_slots: availableSlots
          };
        }
      } else {
        // 3. User hasn't picked a time yet, show them availability
        executedTools.push("checkAvailability");
        actionResults.available_slots = availableSlots.length > 0
          ? availableSlots
          : { error: "No available slots found for this provider right now." };
      }
    } else {
      actionResults.appointment = { error: "No provider selected. Please search for a provider first." };
    }
  }

  // H. Save Tool Message if any action was executed
  if (currentMissionId !== currentState.active_mission_id) {
    await supabase.from("conversation_states").update({ active_mission_id: currentMissionId }).eq("conversation_id", conversationId);
  }

  if (executedTools.length > 0) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "tool",
      tool_name: executedTools.join(", "),
      tool_result: actionResults,
      content: "Backend tools executed successfully."
    });
  }

  // I. Call LLM 3: Final Response Generator
  const finalResponseText = await callLLM(RESPONSE_PROMPT, JSON.stringify({
    context: conversationContext,
    medicalContext: medicalResult,
    toolsExecuted: executedTools.length > 0 ? executedTools : "none",
    toolResults: actionResults
  }), "text");

  // J. Save & Return Final Assistant Message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: finalResponseText
  });

  manageContextWindow(conversationId, currentState.summary).catch(console.error);

  return finalResponseText;
}

// Add this below your processChatMessage function in services/chatOrchestrator.ts

async function manageContextWindow(conversationId: string, currentSummary: string) {
  // 1. Check total message count
  const { count } = await supabase
    .from("messages")
    .select("*", { count: 'exact', head: true })
    .eq("conversation_id", conversationId);

  // 2. Threshold check (e.g., trigger compression if more than 12 messages)
  if (count && count > 6) {
    // 3. Fetch the oldest 8 messages to compress (leaving the 4+ newest for immediate context)
    const { data: oldMsgs } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(8);

    if (!oldMsgs || oldMsgs.length === 0) return;

    const rawHistoryToCompress = oldMsgs
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are a medical scribe managing conversational context. Update the ongoing summary with the new messages provided.
    - Keep it under 150 words.
    - Focus strictly on medical facts, symptoms, constraints, and actionable tasks.
    - Omit conversational filler.`;

    const userPrompt = `Current Summary: ${currentSummary || "No previous history."}\n\nNew Messages to Compress:\n${rawHistoryToCompress}`;

    try {
      // 4. Generate new summary using Gemini
      const newSummary = await callLLM(systemPrompt, userPrompt, "text");

      // 5. Save the new summary
      await supabase
        .from("conversation_states")
        .update({ summary: newSummary.trim() })
        .eq("conversation_id", conversationId);

      // 6. Delete the compressed messages from the database
      const idsToDelete = oldMsgs.map(m => m.id);
      await supabase
        .from("messages")
        .delete()
        .in("id", idsToDelete);

    } catch (error) {
      console.error("Failed to compress context window:", error);
    }
  }
}

// Helper to call LLM API using Gemini via Expo env vars
async function callLLM(systemPrompt: string, userPrompt: string, format: "text" | "json_object" = "text") {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gemini-3.1-flash-lite",
      response_format: { type: format },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateConversationTitle(firstMessage: string) {
  const systemPrompt = "You are a helpful title generator. Reply ONLY with a short 3-4 word title for the conversation, without quotes or extra text.";
  const userPrompt = `Summarize this message into a short title:\n"${firstMessage}"`;

  try {
    const title = await callLLM(systemPrompt, userPrompt, "text");
    return title.trim().replace(/^"|"$/g, ''); // Strip any accidental quotes
  } catch (error) {
    return "Care Navigation"; // Fallback title
  }
}