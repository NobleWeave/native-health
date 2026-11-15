import { supabase } from "./supabase/client";

export type RagSource = {
  sourceId: string;
  title: string;
  sourceType: string;
  sourceDate: string | null;
};

export type RagAnswer = {
  answer: string;
  sources: RagSource[];
};

type IngestResult = {
  sourceId: string;
  chunkCount: number;
};

async function invokeRag<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("careflow-rag", {
    body,
  });

  if (error) {
    // Supabase FunctionsHttpError may contain a JSON response body.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const payload = await context.clone().json();
        if (typeof payload?.error === "string") throw new Error(payload.error);
      } catch (cause) {
        if (cause instanceof Error && cause.message !== "Unexpected end of JSON input") {
          throw cause;
        }
      }
    }
    throw new Error(error.message || "The CareFlow AI service could not be reached.");
  }

  if (!data) throw new Error("The CareFlow AI service returned an empty response.");
  return data;
}

export function ingestDailyLog(payload: Record<string, unknown>) {
  return invokeRag<IngestResult>({
    action: "ingest_daily_log",
    payload,
  });
}

export function ingestOcrDocument(args: {
  extractedText: string;
  fileName: string;
  documentDate?: string | null;
}) {
  return invokeRag<IngestResult>({
    action: "ingest_document",
    ...args,
  });
}

export function askCareAssistant(question: string) {
  return invokeRag<RagAnswer>({
    action: "ask",
    question,
  });
}
