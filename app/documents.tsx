import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, ScrollView, LogBox } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext'; 
import { addTaskToMission, getActiveMissionsForUser, createMission } from '../services/missionEngine'; 
import { ingestOcrDocument } from "@/services/rag";
import { supabase } from "@/services/supabase/client";

LogBox.ignoreLogs(["Response.blob() is using React Native"]);

export default function DocumentsScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [indexStatus, setIndexStatus ] = useState<string>("");
  const { user } = useAuth(); 

  const handleDocumentScan = async () => {
    try {
      const ocrApiKey = process.env.EXPO_PUBLIC_OCR_API_KEY;
      if (!ocrApiKey) {
        Alert.alert(
          "Key Missing",
          "OCR API key not found. Check your .env file and restart Expo with 'npx expo start -c'."
        );
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*', 
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setIsProcessing(true);
      setExtractedText('');
      setIndexStatus("");
      
      const file = result.assets[0];
      const fileName = file.name || "document.jpg";

      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': ocrApiKey, 
        },
        body: formData,
      });

      const data = await response.json();

      if (data?.IsErroredOnProcessing) {
        throw new Error(
          Array.isArray(data.ErrorMessage)
            ? data.ErrorMessage.join(", ")
            : data.ErrorMessage || "OCR processing failed."
        );
      }

      const text = data?.ParsedResults?.[0]?.ParsedText?.trim();

      if (!text) {
        Alert.alert("No Text Found", "Could not detect any text in this image.");
        return;
      }
      setExtractedText(text);

      // Persist for both the chat orchestrator (documents table) and RAG search
      if (user) {
        const today = new Date().toISOString().split("T")[0];

        const [docResult, ragResult] = await Promise.allSettled([
          supabase.from("documents").insert({
            patient_id: user.id,
            document_type: "prescription",
            extracted_text: text,
          }),
          ingestOcrDocument({
            extractedText: text,
            fileName,
            documentDate: today,
          }),
        ]);

        const dbError =
          docResult.status === "rejected"
            ? docResult.reason
            : docResult.value.error;

        if (dbError) {
          console.warn("Could not save to documents table:", dbError);
        }

        if (ragResult.status === "fulfilled") {
          console.log(
            "Document indexed for RAG:",
            ragResult.value.sourceId,
            ragResult.value.chunkCount
          );
          setIndexStatus("Saved & indexed for Health Records AI");
        } else {
          console.warn("Document RAG indexing failed:", ragResult.reason);
          setIndexStatus("Text extracted, but AI record indexing failed");
        }
      }
    } catch (error) {
      console.error('Error during OCR processing:', error);
      Alert.alert(
        "Scan Failed",
        error instanceof Error
          ? error.message
          : "An error occurred while reading the document."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMissionTasks = async () => {
    if (!extractedText) return;
    if (!user) {
      Alert.alert("Authentication Error", "You must be logged in to create tasks.");
      return;
    }

    try {
      setIsProcessing(true);
      
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
      
      if (!GEMINI_API_KEY) {
        Alert.alert("Key Missing", "API key not found. Please run 'npx expo start -c' to clear the cache.");
        setIsProcessing(false);
        return;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a medical assistant parsing a prescription text to extract actionable tasks.
              Return ONLY a strict JSON array of strings. Do not use markdown formatting.
              Format example: ["Take Amoxicillin 500mg - Morning", "15 mins physical therapy - Evening", "Drink 2L water daily"]
              
              Text to parse:
              ${extractedText}`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API Error Details:", data);
        Alert.alert("AI Error", data.error?.message || "Failed to reach Gemini API.");
        return;
      }

      if (!data.candidates || data.candidates.length === 0) {
        Alert.alert("AI Error", "The AI returned an empty response.");
        return;
      }
      
      const rawResponseText = data.candidates[0].content.parts[0].text;      
      
      const firstBracket = rawResponseText.indexOf('[');
      const lastBracket = rawResponseText.lastIndexOf(']');
      
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("Could not locate a valid task array in the AI response.");
      }
      
      const jsonString = rawResponseText.substring(firstBracket, lastBracket + 1);
      const tasksArray: string[] = JSON.parse(jsonString);
      
      let targetMissionId;
      const activeMissions = await getActiveMissionsForUser(user.id);
      
      if (!activeMissions || activeMissions.length === 0) {      
        const newMission = await createMission(
          user.id, 
          "Prescription Follow-up", 
          "Automatically generated from document scan."
        );
        targetMissionId = newMission.id;
      } else {      
        targetMissionId = activeMissions[0].id; 
      }
      
      for (const taskTitle of tasksArray) {
        await addTaskToMission(
          targetMissionId, 
          taskTitle,
          user.id 
        );
      }

      Alert.alert("Success!", `${tasksArray.length} tasks successfully added to the mission.`);

    } catch (error) {
      console.error("Parsing Error:", error);
      Alert.alert("Task Generation Failed", "Could not convert text into tasks.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.sub}>
          Upload a prescription or report and turn it into care tasks.
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleDocumentScan}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Upload Image</Text>
          )}
        </TouchableOpacity>

        {extractedText ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Extracted Content</Text>
            {!!indexStatus && (
              <Text style={styles.statusText}>{indexStatus}</Text>
            )}
            <ScrollView style={styles.scroll}>
              <Text style={styles.resultText} selectable={true}>
                {extractedText}
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.button, { marginTop: 15, backgroundColor: "#17201B" }]}
              onPress={generateMissionTasks}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>Convert to Mission Tasks</Text>
            </TouchableOpacity>

          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  container: { padding: 20, flex: 1 }, 
  title: { fontSize: 26, fontWeight: "700", color: "#17201B" },
  sub: {
    color: "#718078",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#285C3B",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 14,
    flex: 1, 
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17201B",
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  resultText: {
    color: "#718078",
    lineHeight: 22,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#285C3B",
    marginBottom: 10,
  },
});