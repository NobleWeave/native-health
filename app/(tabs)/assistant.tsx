import React, { useState, useEffect, useRef } from "react";
import { 
  StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Pressable, Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { 
  sendMessageToAssistant, 
  fetchUserConversations, 
  fetchConversationMessages, 
  createNewConversation,
  renameConversation,
  deleteConversation,
  setActiveMissionForConversation
} from "../../services/chatApi";
import { useLocalSearchParams, router } from "expo-router";

export default function AssistantScreen() {
  const { user, location } = useAuth();
  const { missionId } = useLocalSearchParams<{ missionId?: string }>();
  
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Rename and Delete states
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);
  
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Initial welcome message
  const defaultMessage = { 
    role: "assistant", 
    content: "Hi! Tell me what you need help with. I can find providers, create care missions, or answer health questions." 
  };

  useEffect(() => {
    async function initChat() {
      if (!user) return;
      await loadHistory();

      if (missionId) {
        try {
          // A. Create a dedicated chat for this mission
          const newConv = await createNewConversation(user.id, "Discussing Care Mission");
          
          // B. Inject the mission into the database context instantly
          await setActiveMissionForConversation(newConv.id, missionId);
          setConversationId(newConv.id);
          
          // C. Set a context-aware greeting
          setMessages([
            { 
              role: "assistant", 
              content: "I have loaded this care mission into our context. What would you like to do? I can help you add tasks, book appointments, or delegate items to your care circle." 
            }
          ]);
          
          await loadHistory(); // Refresh sidebar title
          
          // D. Clear the param so hitting "New Chat" later works normally
          router.setParams({ missionId: undefined });
        } catch (error) {
          console.error("Failed to load mission context", error);
          handleStartNewChat();
        }
      } else if (!conversationId) {
        // Only start a blank chat if we aren't currently viewing one
        handleStartNewChat();
      }
    }
    
    initChat();
  }, [user, missionId]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const history = await fetchUserConversations(user.id);
      setConversations(history);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const handleStartNewChat = () => {
    setConversationId(null);
    setMessages([defaultMessage]);
    setIsMenuOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    setConversationId(id);
    setIsMenuOpen(false);
    setLoading(true);
    
    try {
      const pastMessages = await fetchConversationMessages(id);
      setMessages(pastMessages.length > 0 ? pastMessages : [defaultMessage]);
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  };

  const openRenameModal = (conv: any) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || "");
  };

  const handleSaveRename = async () => {
    if (!editingConvId || !editingTitle.trim()) return;
    setRenamingLoading(true);
    try {
      const trimmed = editingTitle.trim();
      await renameConversation(editingConvId, trimmed);
      setConversations(prev =>
        prev.map(c => (c.id === editingConvId ? { ...c, title: trimmed } : c))
      );
      setEditingConvId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Failed to rename conversation:", error);
      Alert.alert("Error", "Could not rename conversation. Please try again.");
    } finally {
      setRenamingLoading(false);
    }
  };

  const confirmDeleteConversation = (conv: any) => {
    Alert.alert(
      "Delete Conversation",
      `Are you sure you want to delete "${conv.title || "this chat"}"? All messages and conversation state will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteConversation(conv.id)
        }
      ]
    );
  };

  const performDeleteConversation = async (id: string) => {
    setDeletingConvId(id);
    setDeletingLoading(true);
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      // If the currently active conversation was deleted, reset chat
      if (conversationId === id) {
        setConversationId(null);
        setMessages([defaultMessage]);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      Alert.alert("Error", "Could not delete conversation. Please try again.");
    } finally {
      setDeletingLoading(false);
      setDeletingConvId(null);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    
    const userMsg = inputText.trim();
    setInputText("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const userLocation = location || { lat: 23.83, lng: 91.28 };

    try {
      let activeConvId = conversationId;
      
      // If it's a brand new chat, create it first and generate title
      if (!activeConvId) {
        const newConv = await createNewConversation(user.id, userMsg);
        activeConvId = newConv.id;
        setConversationId(activeConvId);
        loadHistory(); // Refresh sidebar with the new title
      }

      if (!activeConvId) return;

      // Send to orchestrator
      const reply = await sendMessageToAssistant(user.id, activeConvId, userMsg, userLocation);
      // console.log("Assistant reply:", reply);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting to the CareFlow network right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        
        {/* Header with Hamburger */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuIcon}>
            <Ionicons name="menu-outline" size={28} color="#17201B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Care Assistant</Text>
            <Text style={styles.sub}>Not a diagnosis. We help you navigate care.</Text>
          </View>
        </View>

        {/* Sidebar Modal */}
        <Modal visible={isMenuOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.drawer}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Conversations</Text>
              </View>

              <TouchableOpacity style={styles.newChatBtn} onPress={handleStartNewChat}>
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>

              <ScrollView style={styles.historyList}>
                {conversations.map(conv => (
                  <View 
                    key={conv.id} 
                    style={[styles.historyItem, conversationId === conv.id && styles.historyItemActive]}
                  >
                    <TouchableOpacity 
                      style={styles.historyContent}
                      onPress={() => handleSelectConversation(conv.id)}
                    >
                      <Ionicons 
                        name="chatbubble-outline" 
                        size={16} 
                        color={conversationId === conv.id ? "#285C3B" : "#718078"} 
                      />
                      <Text 
                        style={[styles.historyText, conversationId === conv.id && styles.historyTextActive]} 
                        numberOfLines={1}
                      >
                        {conv.title || "Care Navigation"}
                      </Text>
                    </TouchableOpacity>

                    {/* Actions: Rename and Delete */}
                    <View style={styles.historyActions}>
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => openRenameModal(conv)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons name="pencil-outline" size={15} color="#52615A" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => confirmDeleteConversation(conv)}
                        disabled={deletingLoading && deletingConvId === conv.id}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        {deletingLoading && deletingConvId === conv.id ? (
                          <ActivityIndicator size="small" color="#C93B2B" />
                        ) : (
                          <Ionicons name="trash-outline" size={15} color="#C93B2B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            
            {/* Clickable background to close drawer */}
            <Pressable style={styles.closeArea} onPress={() => setIsMenuOpen(false)} />
          </View>
        </Modal>

        {/* Rename Dialog Modal */}
        <Modal 
          visible={!!editingConvId} 
          transparent 
          animationType="fade"
          onRequestClose={() => setEditingConvId(null)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.renameOverlay}
          >
            <View style={styles.renameBox}>
              <Text style={styles.renameTitle}>Rename Conversation</Text>
              <TextInput
                value={editingTitle}
                onChangeText={setEditingTitle}
                placeholder="Enter conversation name"
                style={styles.renameInput}
                autoFocus
                selectTextOnFocus
              />
              <View style={styles.renameButtons}>
                <TouchableOpacity 
                  style={[styles.renameBtn, styles.renameBtnCancel]} 
                  onPress={() => setEditingConvId(null)}
                  disabled={renamingLoading}
                >
                  <Text style={styles.renameBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.renameBtn, styles.renameBtnSave]} 
                  onPress={handleSaveRename}
                  disabled={renamingLoading || !editingTitle.trim()}
                >
                  {renamingLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.renameBtnTextSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Chat Body */}
        <ScrollView 
          style={styles.body} 
          contentContainerStyle={{ padding: 20, gap: 12 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => (
            <View key={idx} style={msg.role === "user" ? styles.user : styles.bot}>
              <Text style={msg.role === "user" ? styles.userMsg : styles.msg}>
                {msg.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.bot}>
              <ActivityIndicator color="#285C3B" size="small" />
            </View>
          )}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="E.g., Find a cardiologist near me..."
            style={styles.input}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.send} onPress={handleSend} disabled={loading}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8F6" },
  header: { 
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#E4E8E4", 
    flexDirection: "row", alignItems: "center" 
  },
  menuIcon: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: "700", color: "#17201B" },
  sub: { fontSize: 12, color: "#718078", marginTop: 2 },
  
  body: { flex: 1 },
  bot: { alignSelf: "flex-start", backgroundColor: "white", borderRadius: 16, padding: 14, maxWidth: "82%", borderWidth: 1, borderColor: "#E4E8E4" },
  msg: { color: "#27312B", lineHeight: 20, fontSize: 15 },
  user: { alignSelf: "flex-end", backgroundColor: "#DCE8DF", borderRadius: 16, padding: 14, maxWidth: "82%" },
  userMsg: { color: "#23452F", lineHeight: 20, fontSize: 15 },
  
  composer: { flexDirection: "row", padding: 14, borderTopWidth: 1, borderTopColor: "#E4E8E4", backgroundColor: "white" },
  input: { flex: 1, backgroundColor: "#F2F4F1", borderRadius: 14, paddingHorizontal: 15, fontSize: 15 },
  send: { marginLeft: 8, width: 48, height: 48, borderRadius: 14, backgroundColor: "#285C3B", alignItems: "center", justifyContent: "center" },
  sendText: { color: "white", fontSize: 22, fontWeight: "700" },

  // Sidebar Modal Styles
  modalOverlay: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.4)" },
  closeArea: { flex: 1 },
  drawer: { width: "75%", backgroundColor: "#F7F8F6", height: "100%", padding: 20 },
  drawerHeader: { marginTop: Platform.OS === 'ios' ? 40 : 10, marginBottom: 20 },
  drawerTitle: { fontSize: 22, fontWeight: "800", color: "#17201B" },
  
  newChatBtn: { 
    flexDirection: "row", backgroundColor: "#285C3B", padding: 14, 
    borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8,
    marginBottom: 24 
  },
  newChatText: { color: "white", fontWeight: "700", fontSize: 16 },
  
  historyList: { flex: 1 },
  historyItem: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8 
  },
  historyItemActive: { backgroundColor: "#E6EFE7" },
  historyContent: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: 6
  },
  historyText: { fontSize: 15, color: "#52615A", fontWeight: "500", flex: 1 },
  historyTextActive: { color: "#285C3B", fontWeight: "700" },
  historyActions: {
    flexDirection: "row", alignItems: "center", gap: 4
  },
  actionBtn: {
    padding: 6, borderRadius: 8
  },

  // Rename Dialog Styles
  renameOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24
  },
  renameBox: {
    width: "100%", maxWidth: 340, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6
  },
  renameTitle: {
    fontSize: 18, fontWeight: "700", color: "#17201B", marginBottom: 14
  },
  renameInput: {
    backgroundColor: "#F2F4F1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: "#17201B", borderWidth: 1, borderColor: "#E4E8E4", marginBottom: 18
  },
  renameButtons: {
    flexDirection: "row", justifyContent: "flex-end", gap: 10
  },
  renameBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", justifyContent: "center"
  },
  renameBtnCancel: {
    backgroundColor: "#F2F4F1"
  },
  renameBtnSave: {
    backgroundColor: "#285C3B", minWidth: 70
  },
  renameBtnTextCancel: {
    color: "#52615A", fontWeight: "600", fontSize: 14
  },
  renameBtnTextSave: {
    color: "#FFFFFF", fontWeight: "700", fontSize: 14
  }
});
