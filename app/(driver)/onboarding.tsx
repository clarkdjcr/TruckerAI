import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { onboardingApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { OnboardingStatus, OnboardingStep, RequiredDoc } from '../../src/types';

export default function OnboardingScreen() {
  const qc = useQueryClient();
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiKey, setAiKey] = useState('');
  const [showDocs, setShowDocs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => onboardingApi.status().then(r => r.data as OnboardingStatus),
  });

  const { data: docsData } = useQuery({
    queryKey: ['onboarding-docs'],
    queryFn: () => onboardingApi.documents().then(r => r.data),
    enabled: showDocs,
  });

  const safetyMutation = useMutation({
    mutationFn: () => onboardingApi.acknowledgeSafety(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      Alert.alert('Voice AI Enabled', 'You can now use TruckerAI hands-free. Stay safe out there!');
    },
    onError: () => Alert.alert('Error', 'Could not save acknowledgement.'),
  });

  const aiKeyMutation = useMutation({
    mutationFn: () => {
      if (!aiKey.startsWith('sk-ant-')) {
        throw new Error('Anthropic keys start with "sk-ant-". Get yours at console.anthropic.com.');
      }
      return onboardingApi.setAiKey(aiKey);
    },
    onSuccess: () => {
      setShowAiKey(false);
      setAiKey('');
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      Alert.alert('AI Key Saved', 'Your personal Anthropic key is now active and encrypted.');
    },
    onError: (e: any) => Alert.alert('Invalid Key', e.message),
  });

  const status: OnboardingStatus | undefined = data;
  const checklist = status?.checklist ?? [];
  const complete = checklist.filter(s => s.complete).length;
  const total = checklist.length;
  const required = checklist.filter(s => !s.optional);
  const allRequired = required.every(s => s.complete);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Setup</Text>
          <Text style={styles.subtitle}>{complete}/{total} steps complete</Text>
        </View>
        {allRequired
          ? <Ionicons name="checkmark-circle" size={32} color={Colors.statusGreen} />
          : <Ionicons name="alert-circle-outline" size={32} color={Colors.statusAmber} />
        }
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(complete / total) * 100}%` as any }]} />
      </View>

      {allRequired && (
        <View style={styles.completeCard}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.statusGreen} />
          <Text style={styles.completeText}>You're all set! Optional steps are shown below.</Text>
        </View>
      )}

      {/* Checklist */}
      <View style={styles.section}>
        {checklist.map(step => (
          <StepCard
            key={step.step}
            step={step}
            onAcknowledgeSafety={() => {
              Alert.alert(
                'Voice AI Safety',
                'By enabling voice AI, you agree to:\n\n' +
                '• Only use voice commands hands-free\n' +
                '• Never look at your phone screen while driving\n' +
                '• Pull over for any complex tasks\n\n' +
                'Voice AI keeps your hands on the wheel and is strongly recommended for safety.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'I Agree — Enable Voice',
                    onPress: () => safetyMutation.mutate(),
                  },
                ]
              );
            }}
            onSetAiKey={() => setShowAiKey(!showAiKey)}
            onShowDocs={() => setShowDocs(!showDocs)}
            isSafetyLoading={safetyMutation.isPending}
          />
        ))}
      </View>

      {/* AI Key input */}
      {showAiKey && (
        <View style={styles.aiKeyCard}>
          <Text style={styles.aiKeyTitle}>Add Your Anthropic API Key</Text>
          <Text style={styles.aiKeyDesc}>
            Get a free key at{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://console.anthropic.com/account/keys')}>
              console.anthropic.com
            </Text>
            {'. '}
            Your key is encrypted before being stored.
          </Text>
          <TextInput
            style={styles.aiKeyInput}
            value={aiKey}
            onChangeText={setAiKey}
            placeholder="sk-ant-api03-..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => aiKeyMutation.mutate()}
            disabled={aiKeyMutation.isPending}
          >
            {aiKeyMutation.isPending
              ? <ActivityIndicator color={Colors.white} size="small" />
              : <Text style={styles.saveBtnText}>Save & Encrypt Key</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Document guide */}
      {showDocs && docsData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REQUIRED DOCUMENTS</Text>
          <Text style={styles.docsIntro}>
            Upload these to your private storage folder via the Docs tab.{'\n'}
            {docsData.private_storage_folder && (
              <Text style={styles.storageFolder}>Your folder: {docsData.private_storage_folder}</Text>
            )}
          </Text>
          {docsData.documents?.map((doc: RequiredDoc) => (
            <DocCard key={doc.key} doc={doc} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StepCard({
  step, onAcknowledgeSafety, onSetAiKey, onShowDocs, isSafetyLoading,
}: {
  step: OnboardingStep;
  onAcknowledgeSafety: () => void;
  onSetAiKey: () => void;
  onShowDocs: () => void;
  isSafetyLoading: boolean;
}) {
  const icon = step.complete
    ? 'checkmark-circle'
    : step.optional ? 'ellipse-outline' : 'alert-circle-outline';
  const iconColor = step.complete ? Colors.statusGreen
    : step.optional ? Colors.textMuted
    : Colors.statusAmber;

  return (
    <View style={[styles.stepCard, step.complete && styles.stepCardComplete]}>
      <Ionicons name={icon as any} size={22} color={iconColor} style={{ marginTop: 2 }} />
      <View style={styles.stepContent}>
        <View style={styles.stepTop}>
          <Text style={[styles.stepLabel, step.complete && styles.stepLabelComplete]}>
            {step.label}
          </Text>
          {step.optional && <Text style={styles.optionalTag}>Optional</Text>}
        </View>
        <Text style={styles.stepDesc}>{step.description}</Text>

        {/* Action buttons for incomplete steps */}
        {!step.complete && (
          <>
            {step.step === 'voice_safety' && (
              <TouchableOpacity style={styles.stepAction} onPress={onAcknowledgeSafety} disabled={isSafetyLoading}>
                {isSafetyLoading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.stepActionText}>Review & Enable Voice AI</Text>
                }
              </TouchableOpacity>
            )}
            {step.step === 'ai_key' && (
              <TouchableOpacity style={[styles.stepAction, { backgroundColor: Colors.accent }]} onPress={onSetAiKey}>
                <Text style={styles.stepActionText}>Add My API Key</Text>
              </TouchableOpacity>
            )}
            {step.step === 'documents_uploaded' && (
              <TouchableOpacity style={[styles.stepAction, { backgroundColor: Colors.statusGreen }]} onPress={onShowDocs}>
                <Text style={styles.stepActionText}>View Required Documents</Text>
              </TouchableOpacity>
            )}
            {step.step === 'health_consent' && (
              <Text style={styles.stepHint}>→ Set up in the Health tab</Text>
            )}
            {step.step === 'profile_complete' && (
              <Text style={styles.stepHint}>→ Update your CDL and truck number in your profile</Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function DocCard({ doc }: { doc: RequiredDoc }) {
  return (
    <View style={styles.docCard}>
      <View style={styles.docHeader}>
        <Ionicons name="document-text-outline" size={16} color={Colors.accent} />
        <Text style={styles.docLabel}>{doc.label}</Text>
      </View>
      <Text style={styles.docDesc}>{doc.description}</Text>
      <View style={styles.docWhereRow}>
        <Ionicons name="navigate-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.docWhere}>{doc.where_to_find}</Text>
      </View>
      <Text style={styles.docFor}>Required for: {doc.required_for}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  progressTrack: {
    height: 6, backgroundColor: Colors.bgInput, marginHorizontal: 16,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  completeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: Colors.statusGreen + '15', borderRadius: 12, marginHorizontal: 16,
    padding: 12, borderWidth: 1, borderColor: Colors.statusGreen + '40',
  },
  completeText: { color: Colors.statusGreen, fontSize: 14, fontWeight: '500' },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  stepCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  stepCardComplete: { borderColor: Colors.statusGreen + '40', opacity: 0.8 },
  stepContent: { flex: 1, gap: 6 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  stepLabelComplete: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  optionalTag: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '600',
    backgroundColor: Colors.bgInput, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  stepDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  stepAction: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 4,
  },
  stepActionText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  stepHint: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  aiKeyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, marginHorizontal: 16,
    marginTop: 0, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  aiKeyTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  aiKeyDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  link: { color: Colors.primaryLight, textDecorationLine: 'underline' },
  aiKeyInput: {
    backgroundColor: Colors.bgInput, borderRadius: 10, padding: 12,
    color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 10, padding: 13,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  docsIntro: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  storageFolder: { color: Colors.primary, fontFamily: 'monospace', fontSize: 12 },
  docCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  docHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  docLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  docDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  docWhereRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  docWhere: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },
  docFor: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic' },
});