import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { loadsApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { Load } from '../../src/types';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];

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

export default function LoadsScreen() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-loads', statusFilter],
    queryFn: () => loadsApi.list(statusFilter ? { status: statusFilter } : {}).then(r => r.data),
    refetchInterval: 60_000,
  });

  const loads: Load[] = (data?.results ?? []).filter((l: Load) =>
    !search ||
    l.load_number.toLowerCase().includes(search.toLowerCase()) ||
    l.shipper?.city?.toLowerCase().includes(search.toLowerCase()) ||
    l.consignee?.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loads</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search loads, cities..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {STATUS_FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterBtn, statusFilter === opt.value && styles.filterBtnActive]}
            onPress={() => setStatusFilter(opt.value)}
          >
            <Text style={[styles.filterLabel, statusFilter === opt.value && styles.filterLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={loads}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={false}
          onRefresh={refetch}
          renderItem={({ item }) => <LoadCard load={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No loads found.</Text>
          }
        />
      )}
    </View>
  );
}

function LoadCard({ load }: { load: Load }) {
  const color = STATUS_COLORS[load.status] ?? Colors.textMuted;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.loadNum}>{load.load_number}</Text>
        <View style={[styles.pill, { backgroundColor: color + '22' }]}>
          <Text style={[styles.pillText, { color }]}>{load.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <View style={styles.routeRow}>
        <View style={styles.stop}>
          <Ionicons name="radio-button-on" size={14} color={Colors.statusGreen} />
          <View>
            <Text style={styles.stopName}>{load.shipper?.business_name}</Text>
            <Text style={styles.stopLoc}>{load.shipper?.city}, {load.shipper?.state}</Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
        <View style={styles.stop}>
          <Ionicons name="location" size={14} color={Colors.accent} />
          <View>
            <Text style={styles.stopName}>{load.consignee?.business_name}</Text>
            <Text style={styles.stopLoc}>{load.consignee?.city}, {load.consignee?.state}</Text>
          </View>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{load.pickup_date}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{load.equipment_type}</Text>
        {load.commodity && <>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{load.commodity}</Text>
        </>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  search: {
    marginHorizontal: 16, backgroundColor: Colors.bgInput, color: Colors.textPrimary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterLabel: { color: Colors.textSecondary, fontSize: 13 },
  filterLabelActive: { color: Colors.white, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  loadNum: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stop: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  stopName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  stopLoc: { color: Colors.textSecondary, fontSize: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: Colors.textMuted, fontSize: 12 },
  metaDot: { color: Colors.textMuted },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});