import { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { dispatchApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/theme/colors';
import { Message, Conversation } from '../../src/types';

export default function DispatcherMessages() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const flatRef = useRef<FlatList>(null);

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => dispatchApi.conversations().then(r => r.data),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (convData?.results?.length && !activeConv) {
      setActiveConv(convData.results[0].id);
    }
  }, [convData]);

  const { data: msgData, isLoading } = useQuery({
    queryKey: ['messages', activeConv],
    queryFn: () => dispatchApi.messages(activeConv!).then(r => r.data),
    enabled: !!activeConv,
    refetchInterval: 6_000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => dispatchApi.send(activeConv!, body),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages', activeConv] }); },
  });

  const conversations: Conversation[] = convData?.results ?? [];
  const messages: Message[] = msgData?.results ?? [];

  return (
    <View style={styles.container}>
      {/* Conversation List */}
      <View style={styles.convList}>
        <Text style={styles.convHeader}>Drivers</Text>
        <FlatList
          data={conversations}
          keyExtractor={c => c.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.convItem, activeConv === item.id && styles.convItemActive]}
              onPress={() => setActiveConv(item.id)}
            >
              <Text style={[styles.convName, activeConv === item.id && styles.convNameActive]}>
                {item.driver_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {activeConv ? 'No messages yet.' : 'Select a driver to start messaging.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => m.id.toString()}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.sender === user?.id;
              const isSystem = ['dispatch', 'alert', 'system'].includes(item.message_type);
              if (isSystem) {
                return (
                  <View style={styles.systemMsg}>
                    <Ionicons name="information-circle" size={14} color={Colors.primaryLight} />
                    <Text style={styles.systemText}>{item.body}</Text>
                  </View>
                );
              }
              return (
                <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                  <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirBubble]}>
                    {!isMine && <Text style={styles.senderName}>{item.sender_name}</Text>}
                    <Text style={styles.msgText}>{item.body}</Text>
                    <Text style={styles.msgTime}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {activeConv && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message driver..."
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnOff]}
              onPress={() => { if (text.trim()) sendMutation.mutate(text.trim()); }}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  convList: {
    paddingTop: 60, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  convHeader: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  convItem: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  convItemActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  convName: { color: Colors.textSecondary, fontSize: 14 },
  convNameActive: { color: Colors.white, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textMuted },
  msgRow: { flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
    borderWidth: 1,
  },
  theirBubble: { backgroundColor: Colors.bgCard, borderColor: Colors.border },
  mineBubble: { backgroundColor: Colors.accent + 'CC', borderColor: Colors.accent },
  senderName: { color: Colors.accentLight, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  msgText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21 },
  msgTime: { color: Colors.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right' },
  systemMsg: {
    flexDirection: 'row', gap: 8, backgroundColor: Colors.primary + '18',
    borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: Colors.primaryLight,
  },
  systemText: { flex: 1, color: Colors.primaryLight, fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  input: {
    flex: 1, backgroundColor: Colors.bgInput, color: Colors.textPrimary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnOff: { opacity: 0.4 },
});