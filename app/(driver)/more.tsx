import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { OnboardingStatus } from '../../src/types';

const MENU_ITEMS = [
  {
    key: 'docs',
    label: 'Documents',
    description: 'Upload logs, BOLs, receipts, compliance docs',
    icon: 'document-text-outline',
    color: Colors.primary,
    href: '/(driver)/docs',
  },
  {
    key: 'health',
    label: 'Health & Wellness',
    description: 'Apple Watch monitoring, fatigue tracking, consent',
    icon: 'heart-outline',
    color: Colors.statusRed,
    href: '/(driver)/health',
  },
  {
    key: 'onboarding',
    label: 'Setup & Onboarding',
    description: 'Profile, voice safety, AI key, required documents',
    icon: 'settings-outline',
    color: Colors.accent,
    href: '/(driver)/onboarding',
  },
] as const;

export default function MoreScreen() {
  const router = useRouter();

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => onboardingApi.status().then(r => r.data as OnboardingStatus),
  });

  const setupIncomplete = onboarding && !onboarding.onboarding_complete;
  const pendingSteps = onboarding?.checklist.filter(s => !s.complete && !s.optional).length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Ionicons name="grid-outline" size={24} color={Colors.textMuted} />
      </View>

      {setupIncomplete && pendingSteps > 0 && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => router.push('/(driver)/onboarding' as any)}
        >
          <Ionicons name="alert-circle" size={20} color={Colors.statusAmber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.setupBannerTitle}>Finish your setup</Text>
            <Text style={styles.setupBannerDesc}>
              {pendingSteps} required step{pendingSteps > 1 ? 's' : ''} remaining
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.statusAmber} />
        </TouchableOpacity>
      )}

      <View style={styles.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => router.push(item.href as any)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.menuText}>
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.key === 'onboarding' && setupIncomplete && pendingSteps > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingSteps}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  setupBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: Colors.statusAmber + '18', borderRadius: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    borderWidth: 1, borderColor: Colors.statusAmber + '44',
  },
  setupBannerTitle: { color: Colors.statusAmber, fontSize: 14, fontWeight: '600' },
  setupBannerDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  menu: { marginHorizontal: 16, gap: 10 },
  menuItem: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuLabel: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  menuDesc: { color: Colors.textMuted, fontSize: 13, marginTop: 3 },
  badge: {
    backgroundColor: Colors.statusAmber, borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
});