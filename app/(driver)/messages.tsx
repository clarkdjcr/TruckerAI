import { useState, useEffect, useRef } from 'react';
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

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const flatRef = useRef<FlatList>(null);

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => dispatchApi.conversations().then(r => r.data),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (convData?.results?.length && !activeConv) {
      setActiveConv(convData.results[0].id);
    }
  }, [convData]);

  const { data: msgData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeConv],
    queryFn: () => dispatchApi.messages(activeConv!).then(r => r.data),
    enabled: !!activeConv,
    refetchInterval: 8_000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => dispatchApi.send(activeConv!, body),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', activeConv] });
    },
  });

  const messages: Message[] = msgData?.results ?? [];
  const conversations: Conversation[] = convData?.results ?? [];

  const handleSend = () => {
    if (!text.trim() || !activeConv) return;
    sendMutation.mutate(text.trim());
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender === user?.id;
    const isDispatch = item.message_type === 'dispatch';
    const isAlert = item.message_type === 'alert';

    if (isDispatch || isAlert) {
      return (
        <View style={[styles.systemMsg, isAlert && styles.alertMsg]}>
          <Ionicons
            name={isAlert ? 'warning' : 'information-circle'}
            size={14}
            color={isAlert ? Colors.statusAmber : Colors.primaryLight}
          />
          <Text style={[styles.systemText, isAlert && styles.alertText]}>{item.body}</Text>
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Dispatch</Text>
        {conversations.length > 0 && (
          <Text style={styles.dispatcherName}>
            {conversations[0]?.dispatcher_name}
          </Text>
        )}
      </View>

      {msgsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No messages yet. Say hi to your dispatcher!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          inverted={false}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message dispatcher..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  dispatcherName: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },
  msgRow: { flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
    borderWidth: 1,
  },
  theirBubble: { backgroundColor: Colors.bgCard, borderColor: Colors.border },
  mineBubble: { backgroundColor: Colors.primaryDark, borderColor: Colors.primary },
  senderName: { color: Colors.primaryLight, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  msgText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21 },
  msgTime: { color: Colors.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right' },
  systemMsg: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.primary + '18', borderRadius: 10,
    padding: 10, borderLeftWidth: 3, borderLeftColor: Colors.primaryLight,
  },
  alertMsg: {
    backgroundColor: Colors.statusAmber + '18',
    borderLeftColor: Colors.statusAmber,
  },
  systemText: { flex: 1, color: Colors.primaryLight, fontSize: 13, lineHeight: 19 },
  alertText: { color: Colors.statusAmber },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  input: {
    flex: 1, backgroundColor: Colors.bgInput, color: Colors.textPrimary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});