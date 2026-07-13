import { View, Text, ScrollView, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { healthApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { HealthConsent } from '../../src/types';

const CONSENT_FIELDS: { key: keyof HealthConsent; label: string; description: string; icon: any }[] = [
  {
    key: 'consent_heart_rate',
    label: 'Heart Rate',
    description: 'Monitor current heart rate during your shift',
    icon: 'heart-outline',
  },
  {
    key: 'consent_hrv',
    label: 'Heart Rate Variability',
    description: 'HRV is a key indicator of fatigue and stress',
    icon: 'pulse-outline',
  },
  {
    key: 'consent_sleep',
    label: 'Sleep Tracking',
    description: 'Track sleep hours and quality before your shift',
    icon: 'moon-outline',
  },
  {
    key: 'consent_activity',
    label: 'Activity & Steps',
    description: 'Daily movement and activity data',
    icon: 'walk-outline',
  },
];

export default function HealthScreen() {
  const qc = useQueryClient();

  const { data: consent, isLoading } = useQuery({
    queryKey: ['health-consent'],
    queryFn: () => healthApi.consent().then(r => r.data as HealthConsent),
  });

  const { data: history } = useQuery({
    queryKey: ['health-history'],
    queryFn: () => healthApi.history().then(r => r.data as any[]),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<HealthConsent>) =>
      healthApi.updateConsent({ ...consent, ...updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health-consent'] }),
    onError: () => Alert.alert('Error', 'Could not save preference.'),
  });

  const lastRecord = history?.[0];
  const fatigueScore = lastRecord?.fatigue_score ?? null;
  const fatigueColor = fatigueScore === null ? Colors.textMuted
    : fatigueScore >= 7 ? Colors.statusRed
    : fatigueScore >= 4 ? Colors.statusAmber
    : Colors.statusGreen;

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
          <Text style={styles.title}>Health & Wellness</Text>
          <Text style={styles.subtitle}>Apple Watch monitoring</Text>
        </View>
        <Ionicons name="fitness-outline" size={28} color={Colors.accent} />
      </View>

      {/* Safety notice */}
      <View style={styles.noticeCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
        <Text style={styles.noticeText}>
          Your raw health data is <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>private to you</Text>.
          Dispatchers only see a fatigue alert (yes/no) if you explicitly enable sharing below.
          You can revoke consent at any time.
        </Text>
      </View>

      {/* Current fatigue status */}
      {lastRecord && (
        <View style={[styles.fatigueCard, { borderColor: fatigueColor }]}>
          <View style={styles.fatigueTop}>
            <Text style={styles.fatigueTitle}>Current Fatigue Level</Text>
            <Text style={[styles.fatigueScore, { color: fatigueColor }]}>
              {fatigueScore !== null ? `${fatigueScore.toFixed(1)}/10` : '—'}
            </Text>
          </View>
          <View style={styles.fatigueMeter}>
            <View
              style={[
                styles.fatigueFill,
                {
                  width: `${((fatigueScore ?? 0) / 10) * 100}%` as any,
                  backgroundColor: fatigueColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.fatigueLabel, { color: fatigueColor }]}>
            {fatigueScore === null ? 'No data yet'
              : fatigueScore >= 7 ? '⚠ High fatigue — consider resting'
              : fatigueScore >= 4 ? 'Moderate — monitor closely'
              : 'Good — well rested'}
          </Text>
          {lastRecord.sleep_hours !== null && (
            <Text style={styles.fatigueDetail}>
              Sleep last night: {lastRecord.sleep_hours.toFixed(1)}h
              {lastRecord.hrv_ms !== null ? `  ·  HRV: ${lastRecord.hrv_ms.toFixed(0)}ms` : ''}
            </Text>
          )}
          <Text style={styles.fatigueTime}>
            Last checked: {new Date(lastRecord.timestamp).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {/* Apple Watch connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APPLE WATCH</Text>
        <View style={styles.card}>
          <View style={styles.consentRow}>
            <View style={styles.consentLeft}>
              <Ionicons
                name={consent?.apple_watch_connected ? 'watch' : 'watch-outline'}
                size={20}
                color={consent?.apple_watch_connected ? Colors.statusGreen : Colors.textMuted}
              />
              <View>
                <Text style={styles.consentLabel}>Apple Watch Connected</Text>
                <Text style={styles.consentDesc}>
                  {consent?.apple_watch_connected
                    ? 'Receiving health data from your watch'
                    : 'Open Apple Health on iPhone to pair'}
                </Text>
              </View>
            </View>
            <Switch
              value={consent?.apple_watch_connected ?? false}
              onValueChange={v => updateMutation.mutate({ apple_watch_connected: v })}
              trackColor={{ true: Colors.statusGreen, false: Colors.bgInput }}
              thumbColor={Colors.white}
            />
          </View>
        </View>
      </View>

      {/* Per-metric consent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HEALTH DATA PERMISSIONS</Text>
        <View style={styles.card}>
          {CONSENT_FIELDS.map((field, i) => (
            <View key={field.key}>
              <View style={styles.consentRow}>
                <View style={styles.consentLeft}>
                  <Ionicons
                    name={field.icon}
                    size={20}
                    color={consent?.[field.key] ? Colors.primary : Colors.textMuted}
                  />
                  <View>
                    <Text style={styles.consentLabel}>{field.label}</Text>
                    <Text style={styles.consentDesc}>{field.description}</Text>
                  </View>
                </View>
                <Switch
                  value={consent?.[field.key] as boolean ?? false}
                  onValueChange={v => updateMutation.mutate({ [field.key]: v })}
                  trackColor={{ true: Colors.primary, false: Colors.bgInput }}
                  thumbColor={Colors.white}
                />
              </View>
              {i < CONSENT_FIELDS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

      {/* Dispatcher sharing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DISPATCHER SHARING</Text>
        <View style={styles.card}>
          <View style={styles.consentRow}>
            <View style={styles.consentLeft}>
              <Ionicons
                name="radio-outline"
                size={20}
                color={consent?.share_fatigue_with_dispatcher ? Colors.accent : Colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.consentLabel}>Share Fatigue Alerts</Text>
                <Text style={styles.consentDesc}>
                  Dispatcher sees only a "fatigue alert" status — no raw data, ever.
                  Helps them check in if you're getting tired on a long haul.
                </Text>
              </View>
            </View>
            <Switch
              value={consent?.share_fatigue_with_dispatcher ?? false}
              onValueChange={v => updateMutation.mutate({ share_fatigue_with_dispatcher: v })}
              trackColor={{ true: Colors.accent, false: Colors.bgInput }}
              thumbColor={Colors.white}
            />
          </View>
        </View>
      </View>

      {/* Fatigue tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FATIGUE SAFETY TIPS</Text>
        <View style={styles.card}>
          {[
            { icon: 'bed-outline', tip: 'Aim for 7–8 hours of sleep before a long haul.' },
            { icon: 'cafe-outline', tip: 'Caffeine helps short-term. Don\'t rely on it for HOS compliance.' },
            { icon: 'walk-outline', tip: 'A 10-min walk at rest stops significantly improves alertness.' },
            { icon: 'water-outline', tip: 'Dehydration increases fatigue. Drink water throughout the day.' },
            { icon: 'sunny-outline', tip: 'Natural light in the morning helps regulate your sleep cycle.' },
          ].map((item, i) => (
            <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 10 }]}>
              <Ionicons name={item.icon as any} size={16} color={Colors.textMuted} />
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  noticeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.primary + '15', borderRadius: 12, marginHorizontal: 16,
    padding: 14, borderWidth: 1, borderColor: Colors.primary + '40',
  },
  noticeText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 },
  fatigueCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1, gap: 8,
  },
  fatigueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fatigueTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  fatigueScore: { fontSize: 24, fontWeight: '800' },
  fatigueMeter: {
    height: 8, backgroundColor: Colors.bgInput, borderRadius: 4, overflow: 'hidden',
  },
  fatigueFill: { height: '100%', borderRadius: 4 },
  fatigueLabel: { fontSize: 13, fontWeight: '600' },
  fatigueDetail: { color: Colors.textMuted, fontSize: 12 },
  fatigueTime: { color: Colors.textMuted, fontSize: 11 },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  consentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  consentLeft: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flex: 1 },
  consentLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  consentDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 4 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  tipText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 },
});