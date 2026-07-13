import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { loadsApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { Load } from '../../src/types';

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }> = {
  assigned: { next: 'in_transit', label: 'Start Drive / Pickup', color: Colors.primary },
  at_pickup: { next: 'in_transit', label: 'Depart Shipper', color: Colors.primary },
  in_transit: { next: 'at_delivery', label: 'Arrived at Delivery', color: Colors.accent },
  at_delivery: { next: 'delivered', label: 'Mark Delivered', color: Colors.statusGreen },
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  assigned: 'Assigned',
  at_pickup: 'At Pickup',
  in_transit: 'In Transit',
  at_delivery: 'At Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

export default function LoadScreen() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-loads'],
    queryFn: () => loadsApi.myLoads().then(r => r.data),
    refetchInterval: 60_000,
  });

  const activeLoad: Load | undefined = data?.results?.find(
    (l: Load) => ['assigned', 'in_transit', 'at_pickup', 'at_delivery'].includes(l.status)
  );

  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      loadsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-loads'] }),
    onError: () => Alert.alert('Error', 'Could not update load status.'),
  });

  const handleTransition = (load: Load) => {
    const t = STATUS_TRANSITIONS[load.status];
    if (!t) return;
    Alert.alert('Confirm', `${t.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => transitionMutation.mutate({ id: load.id, status: t.next }) },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!activeLoad) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cube-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Active Load</Text>
        <Text style={styles.emptyText}>Your dispatcher will assign a load to you here.</Text>
      </View>
    );
  }

  const transition = STATUS_TRANSITIONS[activeLoad.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>My Load</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{STATUS_LABELS[activeLoad.status] ?? activeLoad.status}</Text>
        </View>
      </View>

      <View style={styles.loadNumBanner}>
        <Text style={styles.loadNumLabel}>Load #</Text>
        <Text style={styles.loadNum}>{activeLoad.load_number}</Text>
      </View>

      {/* Route */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route</Text>
        <StopRow
          icon="radio-button-on"
          iconColor={Colors.statusGreen}
          label="PICKUP"
          business={activeLoad.shipper?.business_name}
          address={`${activeLoad.shipper?.address_line1}, ${activeLoad.shipper?.city}, ${activeLoad.shipper?.state}`}
          date={activeLoad.pickup_date}
          phone={activeLoad.shipper?.phone}
        />
        <View style={styles.routeLine} />
        <StopRow
          icon="location"
          iconColor={Colors.accent}
          label="DELIVERY"
          business={activeLoad.consignee?.business_name}
          address={`${activeLoad.consignee?.address_line1}, ${activeLoad.consignee?.city}, ${activeLoad.consignee?.state}`}
          date={activeLoad.delivery_date}
          phone={activeLoad.consignee?.phone}
        />
      </View>

      {/* Load Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Load Details</Text>
        <DetailRow label="Equipment" value={activeLoad.equipment_type} />
        {activeLoad.commodity && <DetailRow label="Commodity" value={activeLoad.commodity} />}
        {activeLoad.weight_lbs && <DetailRow label="Weight" value={`${activeLoad.weight_lbs.toLocaleString()} lbs`} />}
        {activeLoad.special_instructions && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsLabel}>Special Instructions</Text>
            <Text style={styles.instructionsText}>{activeLoad.special_instructions}</Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      {transition && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: transition.color }]}
          onPress={() => handleTransition(activeLoad)}
          disabled={transitionMutation.isPending}
        >
          {transitionMutation.isPending
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.actionBtnText}>{transition.label}</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StopRow({ icon, iconColor, label, business, address, date, phone }: any) {
  return (
    <View style={styles.stopRow}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <View style={styles.stopInfo}>
        <Text style={styles.stopLabel}>{label}</Text>
        <Text style={styles.stopBusiness}>{business}</Text>
        <Text style={styles.stopAddress}>{address}</Text>
        <View style={styles.stopMeta}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.stopDate}>{date}</Text>
          {phone && <>
            <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.stopDate}>{phone}</Text>
          </>}
        </View>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '600' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8,
  },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  statusPill: {
    backgroundColor: Colors.primary + '33', paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 20,
  },
  statusText: { color: Colors.primaryLight, fontSize: 12, fontWeight: '600' },
  loadNumBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  loadNumLabel: { color: Colors.textMuted, fontSize: 13 },
  loadNum: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 14 },
  stopRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  routeLine: { width: 1, height: 16, backgroundColor: Colors.border, marginLeft: 9, marginVertical: 4 },
  stopInfo: { flex: 1 },
  stopLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  stopBusiness: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  stopAddress: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  stopMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  stopDate: { color: Colors.textMuted, fontSize: 12, marginRight: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  detailLabel: { color: Colors.textSecondary, fontSize: 14 },
  detailValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  instructions: { marginTop: 10 },
  instructionsLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  instructionsText: { color: Colors.statusAmber, fontSize: 14, lineHeight: 20 },
  actionBtn: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});