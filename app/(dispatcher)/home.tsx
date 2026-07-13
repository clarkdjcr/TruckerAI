import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { loadsApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { Load } from '../../src/types';

const STATUS_COLORS: Record<string, string> = {
  available: Colors.textMuted,
  assigned: Colors.primary,
  at_pickup: Colors.primaryLight,
  in_transit: Colors.statusGreen,
  at_delivery: Colors.accent,
  delivered: Colors.statusGreen,
  completed: Colors.statusGray,
  cancelled: Colors.statusRed,
  on_hold: Colors.statusAmber,
};

export default function DispatcherHome() {
  const { user } = useAuthStore();

  const { data: loadsData } = useQuery({
    queryKey: ['all-loads'],
    queryFn: () => loadsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  });

  const loads: Load[] = loadsData?.results ?? [];

  const counts = {
    available: loads.filter(l => l.status === 'available').length,
    active: loads.filter(l => ['assigned', 'at_pickup', 'in_transit', 'at_delivery'].includes(l.status)).length,
    delivered: loads.filter(l => l.status === 'delivered').length,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dispatcher Dashboard</Text>
          <Text style={styles.name}>{user?.first_name || user?.username}</Text>
        </View>
        <Ionicons name="radio-outline" size={28} color={Colors.accent} />
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <StatCard label="Available" value={counts.available} color={Colors.textMuted} icon="cube-outline" />
        <StatCard label="Active" value={counts.active} color={Colors.statusGreen} icon="navigate" />
        <StatCard label="Delivered" value={counts.delivered} color={Colors.primary} icon="checkmark-circle-outline" />
      </View>

      {/* Active Loads */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Loads</Text>
        {loads
          .filter(l => ['assigned', 'at_pickup', 'in_transit', 'at_delivery'].includes(l.status))
          .map(load => <LoadRow key={load.id} load={load} />)
        }
        {counts.active === 0 && (
          <Text style={styles.emptyText}>No active loads right now.</Text>
        )}
      </View>

      {/* Available Loads */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Unassigned</Text>
        {loads
          .filter(l => l.status === 'available')
          .map(load => <LoadRow key={load.id} load={load} />)
        }
        {counts.available === 0 && (
          <Text style={styles.emptyText}>No unassigned loads.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LoadRow({ load }: { load: Load }) {
  const color = STATUS_COLORS[load.status] ?? Colors.textMuted;
  return (
    <View style={styles.loadRow}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <View style={styles.loadInfo}>
        <View style={styles.loadTop}>
          <Text style={styles.loadNum}>{load.load_number}</Text>
          <Text style={[styles.loadStatus, { color }]}>{load.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.loadRoute}>
          {load.shipper?.city}, {load.shipper?.state} → {load.consignee?.city}, {load.consignee?.state}
        </Text>
        <Text style={styles.loadMeta}>
          {load.pickup_date} · {load.equipment_type}
          {load.commodity ? ` · ${load.commodity}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  greeting: { color: Colors.textSecondary, fontSize: 13 },
  name: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  loadRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  loadInfo: { flex: 1 },
  loadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  loadNum: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  loadStatus: { fontSize: 11, fontWeight: '700' },
  loadRoute: { color: Colors.textSecondary, fontSize: 13 },
  loadMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },
  emptyText: { color: Colors.textMuted, fontSize: 14, paddingVertical: 8 },
});