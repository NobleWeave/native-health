// services/chatOrchestrator.ts
import { z } from "zod";
import { findAndRankCare } from "./navigator";
import {
  createMission,
  addTaskToMission,
  transitionMission,
  getMissionDetails,
  type MissionState,
} from "./missionEngine";
import { bookAppointment } from "./appointmentModel";
import { assignTask } from "./tasks";
import {
  fetchProviderAvailability,
  toggleSlotAvailability,
} from "./availabilityModel";
import { advanceMissionToProviderSelected } from "./missionEngine";
import { supabase } from "./supabase/client";

// --- 1. ZOD SCHEMA FOR MULTI-ACTION PARSING ---
const IntentSchema = z.object({
  intents: z.array(
    z.enum([
      "FIND_CARE",
      "CREATE_MISSION",
      "ADD_TASK",
      "HEALTH_QUESTION",
      "BOOK_APPOINTMENT",
      "DELEGATE_TASK",
      "PROCESS_DOCUMENT",
      "EVALUATE_FOOD",
    ]),
  ),
  entities: z
    .object({
      speciality: z.string().optional(),
      maxCost: z.number().optional(),
      scheme: z.string().optional(), // Captures PM-JAY, CGHS, etc.
      location: z.string().optional(),
      missionTitle: z.string().optional(),
      taskTitles: z.array(z.string()).optional(), // Captures multiple tasks at once
      providerId: z.string().optional(),
      providerName: z.string().optional(),
      slotId: z.string().optional(),
      caregiverName: z.string().optional(),
      appointmentTime: z.string().optional(),
    })
    .optional(),
});

// --- 2. SYSTEM PROMPTS (UPDATED FOR BEHAVIORAL FLOW) ---
const ROUTER_PROMPT = `You are the Intent Router for CareFlow, an AI healthcare navigation assistant.
Your job is to analyze the user's message, classify it into one OR MORE intents, and extract specific entities.

### 1. VALID INTENTS (Choose all that apply)
- FIND_CARE: The user is looking for a doctor, clinic, hospital, or specialist.
- CREATE_MISSION: The user wants to set up a new care goal, tracker, or objective.
- ADD_TASK: The user wants to add actionable to-do items to an existing mission.
- HEALTH_QUESTION: The user is asking about symptoms, diseases, diet, or general medical advice.
- BOOK_APPOINTMENT: User wants to view availability or schedule an appointment.
  - If they select a provider, extract "providerName" and copy its exact UUID from "currentState.foundProviders" into "providerId". NEVER invent a UUID.
  - If they select a time slot from "currentState.availableSlots", copy that slot's exact "id" into "slotId" and its exact "start_time" into "appointmentTime". NEVER guess or change the year/timezone.- DELEGATE_TASK: The user asks a family member, friend, or caregiver to do a specific task.
- PROCESS_DOCUMENT: The user wants to extract action items or missions from an uploaded prescription/document.
- EVALUATE_FOOD: The user asks if a specific or scanned food is healthy for them.
- SELECT_MISSION: The user refers to an existing/previous care mission (e.g., "in my diabetes mission", "add this to the knee surgery goal").

### 2. ENTITY EXTRACTION RULES
Extract the following entities ONLY if explicitly mentioned or strongly implied:
- "speciality" (string): The medical field (e.g., "cardiology", "orthopaedics", "pediatrics").
- "maxCost" (number): Maximum budget or cost mentioned (e.g., 500, 1000).
- "scheme" (string): Specific health insurance schemes (e.g., "PM-JAY", "CGHS").
- "appointmentTime" (string): Extract the ISO 8601 start time ONLY if the user selects a specific time from the provided context. Look closely at the System Note for the exact UTC string.
- "missionTitle" (string): A short 3-4 word title for a new mission being created.
- "taskTitles" (array of strings): A list of actionable steps. If the user asks for suggestions, invent 2-3 logical clinical steps.
- "caregiverName" (string): The name of the person a task is being delegated to.
- "missionSearchQuery" (string): The name of the past mission the user is trying to find.

### 3. EXAMPLES (Strict Output Format)

User: "Find me a cardiologist under 1000 rupees who accepts PM-JAY."
Output:
{
  "intents": ["FIND_CARE"],
  "entities": { "speciality": "cardiology", "maxCost": 1000, "scheme": "PM-JAY" }
}

User: "I have knee pain. Create a mission for my knee surgery and suggest some tasks for it."
Output:
{
  "intents": ["HEALTH_QUESTION", "CREATE_MISSION", "ADD_TASK"],
  "entities": {
    "missionTitle": "Knee Surgery Preparation",
    "taskTitles": ["Apply ice to knee 3 times a day", "Book an orthopaedic consultation"]
  }
}

User: "Add a blood test to my diabetes tracker."
Output:
{
  "intents": ["SELECT_MISSION", "ADD_TASK"],
  "entities": {
    "missionSearchQuery": "diabetes tracker",
    "taskTitles": ["Get a fasting blood test"]
  }
}

User: "Book the 9:00 AM slot." (Context contains: [System Note: The raw UTC timestamps for these slots are: 2026-11-16T03:30:00+00:00])
Output:
{
  "intents": ["BOOK_APPOINTMENT"],
  "entities": { "appointmentTime": "2026-11-16T03:30:00+00:00" }
}

User: "Ask Om to take me to the doctor tomorrow."
Output:
{
  "intents": ["DELEGATE_TASK"],
  "entities": { "caregiverName": "Om" }
}`;

const MEDICAL_PROMPT = `You are a healthcare educational assistant for CareFlow. 
You provide empathetic, structured, and strictly educational advice. 

### CRITICAL RULES
1. NEVER DIAGNOSE: Do not claim certainty about an individual's condition or prescribe medications.
2. SYMPTOM WORKFLOW: If the user mentions pain, discomfort, or a minor symptom (like hair fall or knee pain), you MUST follow this exact 3-step structure:
   - Step 1 (Validate): Empathetically acknowledge their concern.
   - Step 2 (First-Aid/Remedies): Provide 2-3 safe, actionable home remedies or observational trials (e.g., the RICE method for joints, mild shampoos for hair fall).
   - Step 3 (Professional Care): Explicitly advise them that if the symptom persists, they should use CareFlow to search for a specialist (name the exact speciality they should search for, e.g., "orthopaedics" or "dermatology").
3. DIETARY EVALUATION: If the user asks about food AND their 'User Conditions' are provided in the context, evaluate the food strictly against those conditions (e.g., if they have diabetes, immediately evaluate the sugar/carb content).

Keep your responses organized with bullet points, highly scannable, and under 150 words.`;

const RESPONSE_PROMPT = `You are the final CareFlow Assistant response generator.
You will receive raw JSON tool results and optional medical context. Your job is to turn this raw data into a seamless, natural, and empathetic conversational reply.

### RULES FOR HANDLING TOOL RESULTS
- 'providers' array: Do NOT list more than 2 providers. Mention their name, distance (km), and fee. Ask the user if they would like to check available slots for one of them.
- 'available_slots' array: List each slot using ONLY its exact 'displayDate' and 'displayTime' fields (do NOT convert or reinterpret 'start_time'). Ask the user to pick one.
- 'appointment' object: Enthusiastically confirm the exact time and the doctor's name. State that the appointment has been booked.
- 'mission' & 'tasks': Confirm the exact mission title that was created. Use bullet points to list the tasks that were added to it.
- 'delegation': Confirm exactly who the task was assigned to.

### STRICT BOUNDARIES
1. NO HALLUCINATIONS: Never invent providers, available slots, or appointment confirmations. Rely ONLY on the provided JSON tool results. 
2. ERROR HANDLING: If a tool result contains an 'error' key, or if an expected array is empty, apologize politely and explain the exact error to the user in natural language.
3. CONTEXT WEAVING: If 'Medical Context' is provided, weave it naturally into the beginning of your response, and then transition smoothly into the actions you took (the tool results).`;

// --- 3. MAIN ORCHESTRATOR FUNCTION ---
export async function processChatMessage(
  userId: string,
  conversationId: string,
  userMessage: string,
  userLocation: { lat: number; lng: number },
) {
  // A. Save User Message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userMessage,
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
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(6);

  const currentState = stateData || {
    care_context: {},
    active_mission_id: null,
    selected_provider_id: null,
    summary: "",
  };
  const { _lastSummarizedAt, ...cleanCareContext } = currentState.care_context || {};
  const formattedHistory = history
    ? history
        .reverse()
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n")
    : "";
  const backgroundSummary = currentState.summary
    ? `Background Summary of Patient:\n${currentState.summary}\n\n`
    : "";
  const conversationContext = `${backgroundSummary}Recent Conversation:\n${formattedHistory}\n\nCurrent User Query: ${userMessage}`;

  // C. Call LLM 1: The Router
  const routerResponseJson = await callLLM(
    ROUTER_PROMPT,
    JSON.stringify({
      currentDateTime: new Date().toString(),
      context: conversationContext,
      currentState: cleanCareContext,
    }),
    "json_object",
  );
  console.log("Router response:", routerResponseJson);

  // D. Parse & Validate Intents
  const parsed = IntentSchema.parse(JSON.parse(routerResponseJson));
  const { intents, entities = {} } = parsed;
  console.log("Parsed Intents:", intents, "Entities:", entities);

  // E. Merge State Context
  let mergedContext = { ...currentState.care_context, ...entities };
  await supabase.from("conversation_states").upsert({
    conversation_id: conversationId,
    care_context: mergedContext,
    updated_at: new Date().toISOString(),
  });

  let actionResults: Record<string, any> = {};
  let medicalResult: string | null = null;
  let executedTools: string[] = [];
  let currentMissionId: string | null = currentState.active_mission_id;
  let currentProviderId: string | null = currentState.selected_provider_id;

  // Branch 1: Medical & Food Evaluation (Needs Health Profile)
  if (
    intents.includes("HEALTH_QUESTION") ||
    intents.includes("EVALUATE_FOOD")
  ) {
    let contextString = userMessage;
    if (intents.includes("EVALUATE_FOOD")) {
      const { data: healthProfile } = await supabase
        .from("patient_health_profiles")
        .select("conditions, allergies")
        .eq("patient_id", userId)
        .single();
      contextString = `User Query: ${userMessage}\nUser Conditions: ${healthProfile?.conditions || "None"}\nUser Allergies: ${healthProfile?.allergies || "None"}`;
    }
    medicalResult = await callLLM(MEDICAL_PROMPT, contextString, "text");
  }

  // Execute Sequential Action Tools
  // Branch 2: Document Processing (Auto-Mission Creation)
  if (intents.includes("PROCESS_DOCUMENT")) {
    executedTools.push("readDocument");
    // Fetch latest processed document
    const { data: latestDoc } = await supabase
      .from("documents")
      .select("extracted_text, document_type")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestDoc && latestDoc.extracted_text) {
      const docAnalysis = await callLLM(
        "Extract a short mission title and a JSON array of actionable task string titles from this medical document. Format: { title: string, tasks: string[] }",
        latestDoc.extracted_text,
        "json_object",
      );
      const parsedDoc = JSON.parse(docAnalysis);
      const mission = await createMission(
        userId,
        parsedDoc.title,
        "Auto-generated from document",
      );
      currentMissionId = mission.id;

      const addedTasks = await Promise.all(
        parsedDoc.tasks.map((t: string) =>
          addTaskToMission(currentMissionId!, t, userId),
        ),
      );
      actionResults.document_processed = { mission, tasks: addedTasks };
    } else {
      actionResults.document_processed = { error: "No recent document found." };
    }
  }

  // Branch 3: Standard Mission & Task Flow
  if (
    intents.includes("CREATE_MISSION") &&
    !intents.includes("PROCESS_DOCUMENT")
  ) {
    executedTools.push("createMission");
    const mission = await createMission(
      userId,
      entities.missionTitle || "Care Goal",
      "Created via Assistant",
    );
    actionResults.mission = mission;
    currentMissionId = mission.id;
  }

  if (intents.includes("ADD_TASK") && !intents.includes("PROCESS_DOCUMENT")) {
    executedTools.push("addTask");
    if (!currentMissionId) {
      actionResults.tasks = {
        error: "No active mission to add tasks to. Please create one first.",
      };
    } else {
      const tasksToCreate =
        entities.taskTitles && entities.taskTitles.length > 0
          ? entities.taskTitles
          : ["Follow up on care plan"];

      // Execute all task additions concurrently for the active mission
      const addedTasks = await Promise.all(
        tasksToCreate.map((title) =>
          addTaskToMission(currentMissionId!, title, userId),
        ),
      );
      actionResults.tasks = addedTasks;
    }
  }

  // Branch 4: Delegation
  if (
    intents.includes("DELEGATE_TASK")
  ) {
    executedTools.push("delegateTask");
    if (!currentMissionId) {
      actionResults.delegation = {
        error: "No active care mission selected. Please select or create a mission first.",
      };
    } else if (!entities.caregiverName) {
      actionResults.delegation = {
        error: "Please specify which caregiver from your Care Circle you want to assign the task to.",
      };
    } else {
      const { data: cgList } = await supabase
        .from("caregivers")
        .select("caregiver_id, caregiver:profiles!caregiver_id(full_name)")
        .eq("patient_id", userId)
        .eq("status", "active");

      const getCaregiverName = (cg: any): string =>
        Array.isArray(cg?.caregiver)
          ? cg.caregiver[0]?.full_name || ""
          : cg?.caregiver?.full_name || "";

      const targetName = entities.caregiverName.toLowerCase();
      const matchedCg = cgList?.find((cg) =>
        getCaregiverName(cg).toLowerCase().includes(targetName)
      );

      if (!matchedCg) {
        const availableNames = (cgList || []).map(getCaregiverName).filter(Boolean);
        actionResults.delegation = {
          error: `Could not find an active caregiver named "${entities.caregiverName}" in your Care Circle.`,
          available_caregivers: availableNames,
        };
      } else {
        // 1. Prefer a task created in this turn
        let targetTask: { id: string; title: string } | null =
          Array.isArray(actionResults.tasks) && actionResults.tasks.length > 0
            ? actionResults.tasks[0]
            : null;

        // 2. Otherwise look up existing open tasks on the active mission
        if (!targetTask) {
          const { data: existingTasks } = await supabase
            .from("care_tasks")
            .select("id, title")
            .eq("mission_id", currentMissionId)
            .not("status", "in", '("completed","cancelled")')
            .order("created_at", { ascending: false });

          if (existingTasks && existingTasks.length > 0) {
            const requestedTitle = entities.taskTitles?.[0]?.toLowerCase();
            targetTask =
              (requestedTitle
                ? existingTasks.find((t) =>
                    t.title.toLowerCase().includes(requestedTitle)
                  )
                : null) || existingTasks[0];
          }
        }

        if (!targetTask) {
          actionResults.delegation = {
            error: "No open tasks found on this mission to delegate.",
          };
        } else {
          const matchedName = getCaregiverName(matchedCg);
          await assignTask(
            targetTask.id,
            matchedCg.caregiver_id,
            currentMissionId,
            userId,
            targetTask.title
          );
          actionResults.delegation = {
            task: targetTask.title,
            assigned_to: matchedName,
          };
        }
      }
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
      location: userLocation,
    });
    // console.log("Found Providers:", providers);
    actionResults.providers = providers;
    mergedContext.foundProviders = providers.map((p) => ({
      id: p.id,
      name: p.name,
      speciality: p.speciality,
    }));
    currentProviderId = providers.length === 1 ? providers[0].id : null;
    if (providers.length > 0) {
      await supabase
        .from("conversation_states")
        .update({ selected_provider_id: providers[0].id })
        .eq("conversation_id", conversationId);
    }
  }

  if (intents.includes("BOOK_APPOINTMENT")) {
    const providerId = await resolveProviderId(
      entities,
      mergedContext.foundProviders || [],
      currentProviderId
    );
    if (!providerId) {
      actionResults.appointment = {
        error: mergedContext.foundProviders?.length > 0
            ? "Please tell me which provider from the list you'd like to check or book with."
            : "No provider selected. Please search for a provider first.",
      };
    } else {
      currentProviderId = providerId;
      // 1. Fetch upcoming available slots for the provider
      // 1. Fetch and format upcoming available slots in local time
      const slots = await fetchProviderAvailability(providerId);
      const now = new Date();
      const formattedSlots = slots
        .filter((s: any) => s.is_available && new Date(s.start_time) > now)
        .map(formatSlotForUser);

      // Persist formatted slots in care_context so the next turn can pick by slotId
      mergedContext.availableSlots = formattedSlots;

      const userPickedTime = Boolean(entities.slotId || entities.appointmentTime);

      if (userPickedTime) {
        if (!currentMissionId) {
          actionResults.appointment = {
            error:
              "You need an active care mission before booking an appointment. Ask me to create one first.",
          };
        } else {
          executedTools.push("confirmBooking");

          const matchedSlot = resolveSelectedSlot(
            entities,
            formattedSlots,
            userMessage
          );

          if (matchedSlot) {
            const apt = await bookAppointment(
              userId,
              providerId,
              currentMissionId,
              matchedSlot.start_time
            );

            await advanceMissionToProviderSelected(currentMissionId, userId);

            try {
              await toggleSlotAvailability(matchedSlot.id, true);
            } catch (slotErr) {
              console.warn("Could not toggle slot availability:", slotErr);
            }

            // Clear cached slots after booking
            mergedContext.availableSlots = [];

            actionResults.appointment = {
              ...apt,
              displayDate: matchedSlot.displayDate,
              displayTime: matchedSlot.displayTime,
              note: "Appointment request sent to the provider for approval.",
            };
          } else {
            actionResults.appointment = {
              error:
                "That specific time slot is no longer available. Please choose from the available slots.",
              available_slots: formattedSlots,
            };
          }
        }
      } else {
        executedTools.push("checkAvailability");
        actionResults.available_slots =
          formattedSlots.length > 0
            ? formattedSlots
            : {
                error:
                  "No upcoming available slots found for this provider right now.",
              };
      }
    }
  }

  // H. Save Tool Message if any action was executed
  // Strip one-turn booking entities so they don't stick across unrelated future turns
  const {
    providerId: _dropId,
    providerName: _dropName,
    slotId: _dropSlotId,
    appointmentTime: _dropTime,
    ...persistedContext
  } = mergedContext;

  const { error: stateUpdateError } = await supabase
    .from("conversation_states")
    .update({
      care_context: persistedContext,
      active_mission_id: currentMissionId,
      selected_provider_id: currentProviderId,
      updated_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  if (stateUpdateError) {
    console.error("Failed to update conversation_states:", stateUpdateError);
  }

  if (executedTools.length > 0) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "tool",
      tool_name: executedTools.join(", "),
      tool_result: actionResults,
      content: "Backend tools executed successfully.",
    });
  }

  // I. Call LLM 3: Final Response Generator
  const finalResponseText = await callLLM(
    RESPONSE_PROMPT,
    JSON.stringify({
      context: conversationContext,
      medicalContext: medicalResult,
      toolsExecuted: executedTools.length > 0 ? executedTools : "none",
      toolResults: actionResults,
    }),
    "text",
  );

  // J. Save & Return Final Assistant Message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: finalResponseText,
  });

  manageContextWindow(conversationId, currentState.summary || "", _lastSummarizedAt).catch(
    console.error,
  );

  return finalResponseText;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveProviderId(
  entities: { providerId?: string; providerName?: string },
  foundProviders: Array<{ id: string; name: string }> = [],
  currentProviderId: string | null
): Promise<string | null> {
  // 1. Trust entities.providerId ONLY if it is a real UUID
  if (entities.providerId && UUID_REGEX.test(entities.providerId)) {
    return entities.providerId;
  }

  // 2. Match providerName (or a non-UUID providerId like "Provider 1") against recent search results
  const rawName = (
    entities.providerName ||
    (entities.providerId && !UUID_REGEX.test(entities.providerId)
      ? entities.providerId
      : "")
  )
    .trim()
    .toLowerCase();

  if (rawName && foundProviders.length > 0) {
    const exactOrPartial = foundProviders.find(
      (p) =>
        p.name.toLowerCase().includes(rawName) ||
        rawName.includes(p.name.toLowerCase())
    );
    if (exactOrPartial) return exactOrPartial.id;
  }

  // 3. Fallback: search the providers table directly by name (works even without prior FIND_CARE)
  if (rawName) {
    const { data: matched } = await supabase
      .from("providers")
      .select("id")
      .ilike("name", `%${rawName}%`)
      .limit(1)
      .maybeSingle();

    if (matched?.id) return matched.id;
  }

  // 4. Fallback: use the previously selected provider (e.g., when picking a time slot on the next turn)
  return currentProviderId;
}

type FormattedSlot = {
  id: string;
  start_time: string;
  end_time: string;
  displayDate: string;
  displayTime: string;
  label: string;
};

function formatSlotForUser(slot: any): FormattedSlot {
  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);

  const displayDate = start.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endTime = end.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    displayDate,
    displayTime: `${startTime} - ${endTime}`,
    label: `${displayDate}, ${startTime} - ${endTime}`,
  };
}

function resolveSelectedSlot(
  entities: { slotId?: string; appointmentTime?: string },
  availableSlots: FormattedSlot[],
  userMessage: string
): FormattedSlot | undefined {
  // 1. Exact slotId match (most reliable)
  if (entities.slotId) {
    const byId = availableSlots.find((s) => s.id === entities.slotId);
    if (byId) return byId;
  }

  // 2. Exact UTC instant match (ignores +00:00 vs .000Z differences)
  if (entities.appointmentTime) {
    const targetMs = new Date(entities.appointmentTime).getTime();
    if (!Number.isNaN(targetMs)) {
      const byMs = availableSlots.find(
        (s) => new Date(s.start_time).getTime() === targetMs
      );
      if (byMs) return byMs;
    }
  }

  // 3. Fallback: parse local time directly from user message (e.g. "9am", "9:00 AM", "1:30 pm", "13:30")
  const match = userMessage.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    return availableSlots.find((s) => {
      const d = new Date(s.start_time);
      return d.getHours() === hour && d.getMinutes() === minute;
    });
  }

  return undefined;
}

const KEEP_RECENT_MESSAGES = 6;
const COMPRESS_BATCH_THRESHOLD = 6;

async function manageContextWindow(
  conversationId: string,
  currentSummary: string,
  lastSummarizedAt?: string
) {
  // 1. Fetch visible messages that have not been summarized yet
  let query = supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  if (lastSummarizedAt) {
    query = query.gt("created_at", lastSummarizedAt);
  }

  const { data: unsummarized, error } = await query;
  if (error || !unsummarized) return;

  // 2. Wait until we have enough older turns beyond the recent window
  if (unsummarized.length < KEEP_RECENT_MESSAGES + COMPRESS_BATCH_THRESHOLD) {
    return;
  }

  // 3. Compress everything older than the latest 6 messages
  const msgsToCompress = unsummarized.slice(
    0,
    unsummarized.length - KEEP_RECENT_MESSAGES
  );

  const rawHistoryToCompress = msgsToCompress
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a medical scribe managing conversational context. Update the ongoing summary with the new messages provided.
- Keep it under 150 words.
- Focus strictly on medical facts, symptoms, constraints, and actionable tasks.
- Omit conversational filler.`;

  const userPrompt = `Current Summary: ${currentSummary || "No previous history."}\n\nNew Messages to Compress:\n${rawHistoryToCompress}`;

  try {
    const newSummary = await callLLM(systemPrompt, userPrompt, "text");
    const newCursor = msgsToCompress[msgsToCompress.length - 1].created_at;

    // Re-read latest care_context so we don't clobber recent entity updates
    const { data: latestState } = await supabase
      .from("conversation_states")
      .select("care_context")
      .eq("conversation_id", conversationId)
      .single();

    await supabase
      .from("conversation_states")
      .update({
        summary: newSummary.trim(),
        care_context: {
          ...(latestState?.care_context || {}),
          _lastSummarizedAt: newCursor,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId);
  } catch (err) {
    console.error("Failed to compress context window:", err);
  }
}

// Helper to call LLM API using Gemini via Expo env vars
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  format: "text" | "json_object" = "text",
) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        response_format: { type: format },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateConversationTitle(firstMessage: string) {
  const systemPrompt =
    "You are a helpful title generator. Reply ONLY with a short 3-4 word title for the conversation, without quotes or extra text.";
  const userPrompt = `Summarize this message into a short title:\n"${firstMessage}"`;

  try {
    const title = await callLLM(systemPrompt, userPrompt, "text");
    return title.trim().replace(/^"|"$/g, ""); // Strip any accidental quotes
  } catch (error) {
    return "Care Navigation"; // Fallback title
  }
}
