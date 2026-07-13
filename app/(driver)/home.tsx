import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authApi, loadsApi } from '../../src/api/client';
import { Colors, HOSStatusColor } from '../../src/theme/colors';
import { Load } from '../../src/types';

const DUTY_OPTIONS = [
  { value: 'driving', label: 'Driving', icon: 'car' },
  { value: 'on_duty', label: 'On Duty', icon: 'briefcase' },
  { value: 'off_duty', label: 'Off Duty', icon: 'moon' },
  { value: 'sleeper_berth', label: 'Sleeper', icon: 'bed' },
] as const;

function HOSBar({ label, used, max, color }: { label: string; used: number; max: number; color: string }) {
  const remaining = Math.max(0, max - used);
  const pct = Math.min(100, (remaining / max) * 100);
  return (
    <View style={styles.hosRow}>
      <Text style={styles.hosLabel}>{label}</Text>
      <View style={styles.hosTrack}>
        <View style={[styles.hosFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.hosTime}>{remaining.toFixed(1)}h</Text>
    </View>
  );
}

export default function DriverHome() {
  const { user, hos, setHOS } = useAuthStore();

  const { data: loadsData } = useQuery({
    queryKey: ['my-loads'],
    queryFn: () => loadsApi.myLoads().then(r => r.data),
    refetchInterval: 60_000,
  });

  const hosMutation = useMutation({
    mutationFn: (status: string) => authApi.updateHOS({ duty_status: status }),
    onSuccess: (res) => {
      if (res.data.hos) setHOS(res.data.hos);
    },
    onError: () => Alert.alert('Error', 'Could not update duty status.'),
  });

  const activeLoad: Load | undefined = loadsData?.results?.find(
    (l: Load) => ['assigned', 'in_transit', 'at_pickup', 'at_delivery'].includes(l.status)
  );

  const driveRemaining = hos?.drive_remaining_hrs ?? 11;
  const windowRemaining = hos?.window_remaining_hrs ?? 14;
  const cycleRemaining = hos?.cycle_remaining_hrs ?? 70;

  const hosColor = driveRemaining < 2 ? Colors.statusRed
    : driveRemaining < 4 ? Colors.statusAmber
    : Colors.statusGreen;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.name}>{user?.first_name || user?.username}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: HOSStatusColor[hos?.duty_status ?? 'off_duty'] + '33' }]}>
          <View style={[styles.statusDot, { backgroundColor: HOSStatusColor[hos?.duty_status ?? 'off_duty'] }]} />
          <Text style={[styles.statusText, { color: HOSStatusColor[hos?.duty_status ?? 'off_duty'] }]}>
            {hos?.duty_status?.replace('_', ' ').toUpperCase() ?? 'OFF DUTY'}
          </Text>
        </View>
      </View>

      {/* HOS Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hours of Service</Text>
        {hos?.break_required && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color={Colors.statusAmber} />
            <Text style={styles.alertText}>30-minute break required before driving</Text>
          </View>
        )}
        <HOSBar label="Drive" used={11 - driveRemaining} max={11} color={hosColor} />
        <HOSBar label="Window" used={14 - windowRemaining} max={14} color={Colors.primary} />
        <HOSBar label="Cycle" used={70 - cycleRemaining} max={70} color={Colors.primaryLight} />
      </View>

      {/* Duty Status Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Duty Status</Text>
        <View style={styles.dutyGrid}>
          {DUTY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dutyBtn,
                hos?.duty_status === opt.value && styles.dutyBtnActive,
              ]}
              onPress={() => hosMutation.mutate(opt.value)}
            >
              <Ionicons
                name={opt.icon as any}
                size={20}
                color={hos?.duty_status === opt.value ? Colors.white : Colors.textSecondary}
              />
              <Text style={[
                styles.dutyLabel,
                hos?.duty_status === opt.value && styles.dutyLabelActive,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Load */}
      {activeLoad ? (
        <View style={[styles.card, styles.loadCard]}>
          <View style={styles.loadHeader}>
            <Text style={styles.cardTitle}>Active Load</Text>
            <Text style={styles.loadNumber}>{activeLoad.load_number}</Text>
          </View>
          <View style={styles.loadRoute}>
            <View style={styles.loadStop}>
              <Ionicons name="radio-button-on" size={16} color={Colors.statusGreen} />
              <View style={styles.loadStopText}>
                <Text style={styles.stopName}>{activeLoad.shipper?.business_name}</Text>
                <Text style={styles.stopLocation}>{activeLoad.shipper?.city}, {activeLoad.shipper?.state}</Text>
                <Text style={styles.stopDate}>Pickup: {activeLoad.pickup_date}</Text>
              </View>
            </View>
            <View style={styles.loadLine} />
            <View style={styles.loadStop}>
              <Ionicons name="location" size={16} color={Colors.accent} />
              <View style={styles.loadStopText}>
                <Text style={styles.stopName}>{activeLoad.consignee?.business_name}</Text>
                <Text style={styles.stopLocation}>{activeLoad.consignee?.city}, {activeLoad.consignee?.state}</Text>
                <Text style={styles.stopDate}>Delivery: {activeLoad.delivery_date}</Text>
              </View>
            </View>
          </View>
          {activeLoad.commodity && (
            <Text style={styles.commodity}>📦 {activeLoad.commodity}
              {activeLoad.weight_lbs ? ` · ${activeLoad.weight_lbs.toLocaleString()} lbs` : ''}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.noLoad}>No active load assigned</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  greeting: { color: Colors.textSecondary, fontSize: 14 },
  name: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.statusAmber + '22', borderRadius: 8, padding: 10, marginBottom: 12,
  },
  alertText: { color: Colors.statusAmber, fontSize: 13 },
  hosRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  hosLabel: { color: Colors.textSecondary, fontSize: 13, width: 52 },
  hosTrack: {
    flex: 1, height: 8, backgroundColor: Colors.bgInput, borderRadius: 4, overflow: 'hidden',
  },
  hosFill: { height: '100%', borderRadius: 4 },
  hosTime: { color: Colors.textPrimary, fontSize: 13, width: 38, textAlign: 'right' },
  dutyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dutyBtn: {
    flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgInput, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  dutyBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dutyLabel: { color: Colors.textSecondary, fontSize: 13 },
  dutyLabelActive: { color: Colors.white, fontWeight: '600' },
  loadCard: { borderColor: Colors.primaryDark },
  loadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  loadNumber: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
  loadRoute: { gap: 0 },
  loadStop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  loadLine: { width: 1, height: 20, backgroundColor: Colors.border, marginLeft: 7, marginVertical: 2 },
  loadStopText: { flex: 1 },
  stopName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  stopLocation: { color: Colors.textSecondary, fontSize: 13 },
  stopDate: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  commodity: { color: Colors.textSecondary, fontSize: 13, marginTop: 12 },
  noLoad: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
});