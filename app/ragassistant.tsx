import { askCareAssistant, type RagSource } from "@/services/rag";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  sources?: RagSource[];
};

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! Ask me about information in your saved health logs and medical documents.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsSending(true);

    try {
      const result = await askCareAssistant(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "I couldn't process that question. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <View style={styles.header}>
          <Text style={styles.title}>Care Assistant</Text>
          <Text style={styles.sub}>
            Answers are based on your saved records. Not a diagnosis.
          </Text>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled">
          {messages.map((message) => (
            <View
              key={message.id}
              style={message.role === "user" ? styles.user : styles.bot}>
              <Text
                style={message.role === "user" ? styles.userMsg : styles.msg}>
                {message.text}
              </Text>
              {!!message.sources?.length && (
                <View style={styles.sources}>
                  <Text style={styles.sourceHeading}>Sources</Text>
                  {message.sources.map((source) => (
                    <Text key={source.sourceId} style={styles.sourceText}>
                      • {source.title}
                      {source.sourceDate ? ` · ${source.sourceDate}` : ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
          {isSending && (
            <View style={styles.loading}>
              <ActivityIndicator color="#285C3B" size="small" />
              <Text style={styles.loadingText}>Searching your records...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            placeholder="Ask about your health records..."
            placeholderTextColor="#8A948E"
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={1000}
            editable={!isSending}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.send,
              (!question.trim() || isSending) && styles.sendDisabled,
            ]}
            onPress={handleSend}
            disabled={!question.trim() || isSending}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  keyboard: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E8E4",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#17201B" },
  sub: { fontSize: 12, color: "#718078", marginTop: 4 },
  body: { flex: 1 },
  messageList: { padding: 20, gap: 12, flexGrow: 1 },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    maxWidth: "88%",
  },
  msg: { color: "#27312B", lineHeight: 21 },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#DCE8DF",
    borderRadius: 16,
    padding: 14,
    maxWidth: "88%",
  },
  userMsg: { color: "#23452F", lineHeight: 21 },
  sources: {
    borderTopWidth: 1,
    borderTopColor: "#E4E8E4",
    marginTop: 10,
    paddingTop: 8,
    gap: 4,
  },
  sourceHeading: { color: "#285C3B", fontSize: 11, fontWeight: "700" },
  sourceText: { color: "#718078", fontSize: 11, lineHeight: 16 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    padding: 10,
  },
  loadingText: { color: "#718078", fontSize: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E4E8E4",
    backgroundColor: "white",
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    backgroundColor: "#F2F4F1",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: "#17201B",
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#285C3B",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: "white", fontSize: 22, fontWeight: "700" },
});
