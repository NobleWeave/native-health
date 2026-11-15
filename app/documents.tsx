import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, ScrollView, LogBox } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from 'expo-document-picker';
import { ingestOcrDocument } from '../services/rag';

// Ignore the specific React Native blob warning so it stops popping up
LogBox.ignoreLogs(["Response.blob() is using React Native"]);

export default function DocumentsScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");

  const handleDocumentScan = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*', 
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setIsProcessing(true);
      setExtractedText('');
      
      const file = result.assets[0];

      // Convert the local file URI to a standard Blob (Fix for Expo's fetch)
      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();
      const apiKey = process.env.EXPO_PUBLIC_OCR_API_KEY;

      if (!apiKey) {
        throw new Error("OCR API key is not configured.");
      }

      // Build the form data using the Blob
      const formData = new FormData();
      formData.append('file', blob, file.name || 'document.jpg');
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      // Send the API request with your personal key
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          apikey: apiKey,
        },
        body: formData,
      });

      const data = await response.json();

      if (data && data.ParsedResults && data.ParsedResults.length > 0) {
        const text = data.ParsedResults[0].ParsedText;
        if (!text?.trim()) {
          Alert.alert('No Text Found', 'Could not detect any text in this image.');
          return;
        }
        setExtractedText(text);
        const saved = await ingestOcrDocument({
          extractedText: text,
          fileName: file.name || 'medical-document',
        });
        Alert.alert(
          'Document Saved',
          `Extracted text was added to your searchable patient records (${saved.chunkCount} chunks).`,
        );
      } else {
        Alert.alert('No Text Found', 'Could not detect any text in this image.');
      }

    } catch (error) {
      console.error('Error during OCR processing:', error);
      Alert.alert(
        'Scan Failed',
        error instanceof Error ? error.message : 'An error occurred while reading or saving the document.',
      );
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
            <Text style={styles.buttonText}>Upload image</Text>
          )}
        </TouchableOpacity>

        {extractedText ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Extracted Content</Text>
            <ScrollView style={styles.scroll}>
              <Text style={styles.resultText} selectable={true}>
                {extractedText}
              </Text>
            </ScrollView>
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
  }
});