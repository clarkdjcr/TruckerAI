
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioPlayer,
  AudioModule,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { voiceApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

interface Exchange {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export default function VoiceScreen() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [responseAudioUri, setResponseAudioUri] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([
    { id: '0', role: 'ai', text: "Hey! I'm your TruckerAI assistant. Tap the mic and ask me anything — HOS, routes, fuel, loads, weather. I've got you covered." },
  ]);
  const scrollRef = useRef<ScrollView>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(responseAudioUri ?? '');

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().catch(() => {});
    return () => { recorder.release(); };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice commands.');
        return;
      }
      recorder.record();
      setIsListening(true);
    } catch (e) {
      Alert.alert('Recording Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!isListening) return;
    setIsListening(false);
    setIsThinking(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) throw new Error('No recording URI');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'voice.m4a',
        type: 'audio/m4a',
      } as any);
      if (sessionId) formData.append('session_id', sessionId);

      const { data } = await voiceApi.audioInteract(formData);

      if (data.session_id) setSessionId(data.session_id);
      if (data.transcript) addExchange('user', data.transcript);
      if (data.text_response) addExchange('ai', data.text_response);

      // Play audio response
      if (data.audio_base64) {
        const audioUri = `${FileSystem.cacheDirectory}response_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(audioUri, data.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setResponseAudioUri(audioUri);
        player.play();
      }
    } catch (e: any) {
      addExchange('ai', "Sorry, I had trouble with that. Try again or type your question.");
    } finally {
      setIsThinking(false);
    }
  };

  const addExchange = (role: 'user' | 'ai', text: string) => {
    setExchanges(prev => [...prev, { id: Date.now().toString(), role, text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Voice-powered trucker companion</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {exchanges.map(ex => (
          <View
            key={ex.id}
            style={[styles.bubble, ex.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            {ex.role === 'ai' && (
              <Text style={styles.aiLabel}>🚛 TruckerAI</Text>
            )}
            <Text style={[styles.bubbleText, ex.role === 'user' && styles.userText]}>
              {ex.text}
            </Text>
          </View>
        ))}
        {isThinking && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiLabel}>🚛 TruckerAI</Text>
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.thinkingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mic Button */}
      <View style={styles.controls}>
        <Text style={styles.hint}>
          {isListening ? 'Listening... release to send' : 'Hold to speak'}
        </Text>
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isThinking}
          activeOpacity={0.8}
        >
          {isThinking
            ? <ActivityIndicator size="large" color={Colors.white} />
            : <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={40} color={Colors.white} />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  chat: { flex: 1 },
  bubble: {
    maxWidth: '85%', borderRadius: 16, padding: 14,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  aiBubble: { alignSelf: 'flex-start' },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  aiLabel: { color: Colors.primaryLight, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  bubbleText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 22 },
  userText: { color: Colors.white },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingText: { color: Colors.textSecondary, fontSize: 14 },
  controls: { padding: 24, alignItems: 'center', gap: 12 },
  hint: { color: Colors.textSecondary, fontSize: 14 },
  micBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  micBtnActive: {
    backgroundColor: Colors.statusRed,
    shadowColor: Colors.statusRed,
    transform: [{ scale: 1.1 }],
  },
});