import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, StyleSheet,
  TouchableOpacity, Platform,
  SafeAreaView, ActivityIndicator, Keyboard, Dimensions
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from "../supabase";
import { MaterialIcons } from "@expo/vector-icons";

export default function Chat() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState(null);
  const [isChef, setIsChef] = useState(false);
  const [clients, setClients] = useState([]);
  const [partner, setPartner] = useState(null);
  const [search, setSearch] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef(null);
  const channelRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    init();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (partner) {
      fetchMessages();
      setupSubscription();
      const interval = setInterval(fetchMessages, 5000);
      return () => {
        clearInterval(interval);
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }
  }, [partner]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data, error } = await supabase
      .from("clients")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) return alert(error.message);

    if (data.role === "chef") {
      setIsChef(true);
      fetchClients();
    } else {
      const chef = await getChef();
      if (chef) setPartner(chef);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, prenom, nom")
      .neq("role", "chef");
    setClients(data);
  };

  const getChef = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, prenom, nom")
      .eq("role", "chef")
      .limit(1);
    return data?.[0] || null;
  };

  const fetchMessages = async () => {
    if (!partner) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });
    setMessages(data);
  };

  const setupSubscription = () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel("messages-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages"
      }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === userId && msg.receiver_id === partner.id) ||
          (msg.sender_id === partner.id && msg.receiver_id === userId)
        ) {
          setMessages(prev => [...prev, msg]);
          scrollToEnd();
        }
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!input.trim() || !partner) return;

    const messageContent = input.trim();
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: partner.id,
      content: messageContent,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToEnd();

    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: partner.id,
        content: messageContent,
      });

    if (!error) setInput("");
  };

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === userId;
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowRight : styles.messageRowLeft
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleRight : styles.bubbleLeft
          ]}
        >
          <Text style={isMe ? styles.contentRight : styles.contentLeft}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (isChef && !partner) {
    const filteredClients = clients.filter(c => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.prenom && c.prenom.toLowerCase().includes(q)) ||
        (c.nom && c.nom.toLowerCase().includes(q))
      );
    });
    return (
      <SafeAreaView style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => setPartner(item)}
            >
              <Text style={styles.clientEmail}>{item.prenom} {item.nom}</Text>
              <MaterialIcons name="chevron-right" size={24} color="#888" />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  if (!partner) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const bottomSpace = Math.max(
    keyboardHeight > 0 
      ? keyboardHeight - insets.bottom 
      : insets.bottom + 10,
    10
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ 
            padding: 16, 
            paddingBottom: bottomSpace + 70
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <View style={[styles.inputContainer, { 
        paddingBottom: bottomSpace,
        paddingTop: 10,
        backgroundColor: '#fff',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#e0e0e0'
      }]}>
        <TextInput
          ref={textInputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Votre message..."
          placeholderTextColor="#999"
          style={styles.input}
          multiline
          onFocus={scrollToEnd}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          disabled={!input.trim()}
          style={styles.sendButton}
        >
          <MaterialIcons 
            name="send" 
            size={24} 
            color={input.trim() ? "#FF9500" : "#CCC"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  messageRow: { marginVertical: 4, maxWidth: "80%" },
  messageRowLeft: { alignSelf: "flex-start" },
  messageRowRight: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 16, marginVertical: 4 },
  bubbleLeft: { backgroundColor: "#FFF", borderBottomLeftRadius: 4 },
  bubbleRight: { backgroundColor: "#FF9500", borderBottomRightRadius: 4 },
  contentLeft: { color: "#333", fontSize: 16 },
  contentRight: { color: "#fff", fontSize: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginRight: 10,
    color: "#333",
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
  },
  sendButton: {
    padding: 8,
  },
  searchInput: {
    backgroundColor: '#fff', 
    borderRadius: 20, 
    paddingHorizontal: 16,
    paddingVertical: 12, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#eee',
    margin: 16,
    marginBottom: 8,
  },
  clientCard: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    padding: 16, 
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'white', 
    borderRadius: 12, 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  clientEmail: { fontSize: 16, color: '#333' },
});
