import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { communicationsApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { CustomerComm } from '../../src/types';

const COMM_TYPE_LABELS: Record<string, string> = {
  eta: 'ETA',
  arrival: 'Arrival',
  delivery: 'Delivered',
  delay: 'Delay',
  issue: 'Issue',
  general: 'General',
};

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.statusAmber,
  sent: Colors.primary,
  delivered: Colors.statusGreen,
  failed: Colors.statusRed,
  confirmed: Colors.statusGreen,
};

const CHANNEL_ICONS: Record<string, any> = {
  email: 'mail-outline',
  sms: 'chatbubble-outline',
  voice_ai: 'mic-outline',
  manual: 'person-outline',
};

export default function CommsLog() {
  const [driverFilter, setDriverFilter] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['comms-log', driverFilter],
    queryFn: () =>
      communicationsApi.log(driverFilter ? { driver: driverFilter } : undefined)
        .then(r => r.data as CustomerComm[]),
    refetchInterval: 60_000,
  });

  const comms: CustomerComm[] = data ?? [];

  // Unique drivers for filter
  const drivers = Array.from(new Set(comms.map(c => c.driver_name))).sort();

  const filtered = driverFilter
    ? comms.filter(c => c.driver_name === driverFilter)
    : comms;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customer Comms</Text>
          <Text style={styles.subtitle}>{comms.length} notifications logged</Text>
        </View>
        <Ionicons name="megaphone-outline" size={28} color={Colors.accent} />
      </View>

      {/* Driver filter chips */}
      {drivers.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            style={[styles.filterChip, !driverFilter && styles.filterChipActive]}
            onPress={() => setDriverFilter(null)}
          >
            <Text style={[styles.filterText, !driverFilter && styles.filterTextActive]}>All Drivers</Text>
          </TouchableOpacity>
          {drivers.map(name => (
            <TouchableOpacity
              key={name}
              style={[styles.filterChip, driverFilter === name && styles.filterChipActive]}
              onPress={() => setDriverFilter(driverFilter === name ? null : name)}
            >
              <Text style={[styles.filterText, driverFilter === name && styles.filterTextActive]}>
                {name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading && (
        <Text style={styles.loading}>Loading communications...</Text>
      )}

      {filtered.length === 0 && !isLoading && (
        <View style={styles.emptyCard}>
          <Ionicons name="mail-open-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No customer communications yet.</Text>
          <Text style={styles.emptyHint}>Notifications appear here when drivers send ETAs or delivery confirmations.</Text>
        </View>
      )}

      <View style={{ marginHorizontal: 16, marginTop: 8 }}>
        {filtered.map(comm => (
          <CommCard key={comm.id} comm={comm} />
        ))}
      </View>
    </ScrollView>
  );
}

function CommCard({ comm }: { comm: CustomerComm }) {
  const statusColor = STATUS_COLORS[comm.comm_status] ?? Colors.textMuted;
  const typeLabel = COMM_TYPE_LABELS[comm.comm_type] ?? comm.comm_type;
  const channelIcon = CHANNEL_ICONS[comm.channel] ?? 'send-outline';
  const hasResponse = !!comm.response_text;

  return (
    <View style={styles.commCard}>
      {/* Top row */}
      <View style={styles.commTop}>
        <View style={styles.commLeft}>
          <Ionicons name={channelIcon} size={14} color={Colors.textMuted} />
          <View style={[styles.typePill, { backgroundColor: Colors.primary + '22' }]}>
            <Text style={[styles.typeText, { color: Colors.primaryLight }]}>{typeLabel}</Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {comm.comm_status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Route: driver → customer */}
      <View style={styles.route}>
        <Text style={styles.driverName}>{comm.driver_name}</Text>
        <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} />
        <Text style={styles.customerName}>{comm.customer_name}</Text>
        {comm.load_number && (
          <Text style={styles.loadTag}>#{comm.load_number}</Text>
        )}
      </View>

      {/* Message preview */}
      <Text style={styles.messagePreview} numberOfLines={2}>
        {comm.message_body}
      </Text>

      {/* ETA if present */}
      {comm.estimated_arrival && (
        <View style={styles.etaRow}>
          <Ionicons name="time-outline" size={13} color={Colors.accent} />
          <Text style={styles.etaText}>
            ETA: {new Date(comm.estimated_arrival).toLocaleString([], {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </Text>
        </View>
      )}

      {/* Customer response */}
      {hasResponse && (
        <View style={styles.responseBox}>
          <Ionicons name="return-down-back-outline" size={13} color={Colors.statusGreen} />
          <Text style={styles.responseText} numberOfLines={2}>{comm.response_text}</Text>
        </View>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {comm.sent_at
          ? `Sent ${new Date(comm.sent_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
          : `Logged ${new Date(comm.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  filterRow: { marginBottom: 8, maxHeight: 48 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 13 },
  filterTextActive: { color: Colors.white, fontWeight: '600' },
  loading: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  emptyCard: {
    alignItems: 'center', gap: 10, marginTop: 48, paddingHorizontal: 32,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  commCard: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  commTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: '600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  customerName: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  loadTag: { color: Colors.textMuted, fontSize: 12 },
  messagePreview: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaText: { color: Colors.accent, fontSize: 13, fontWeight: '500' },
  responseBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.statusGreen + '11', borderRadius: 6, padding: 8,
  },
  responseText: { color: Colors.statusGreen, fontSize: 12, flex: 1 },
  timestamp: { color: Colors.textMuted, fontSize: 11 },
});