import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { maintenanceApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { MaintenanceVehicle } from '../../src/types';

const ALERT_COLORS = {
  overdue: Colors.statusRed,
  due: Colors.statusAmber,
  approaching: Colors.primary,
};

const ALERT_ICONS: Record<string, any> = {
  overdue: 'warning',
  due: 'alert-circle-outline',
  approaching: 'time-outline',
};

export default function MaintenanceDashboard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['maintenance-dashboard'],
    queryFn: () => maintenanceApi.dashboard().then(r => r.data as MaintenanceVehicle[]),
    refetchInterval: 5 * 60_000, // refresh every 5 min
  });

  const vehicles: MaintenanceVehicle[] = data ?? [];

  const totals = vehicles.reduce(
    (acc, v) => ({
      overdue: acc.overdue + v.alerts.filter(a => a.alert_level === 'overdue').length,
      due: acc.due + v.alerts.filter(a => a.alert_level === 'due').length,
      urgent: acc.urgent + v.urgent_reports,
      open: acc.open + v.open_reports,
    }),
    { overdue: 0, due: 0, urgent: 0, open: 0 }
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Maintenance</Text>
          <Text style={styles.subtitle}>{vehicles.length} vehicles tracked</Text>
        </View>
        <Ionicons name="construct-outline" size={28} color={Colors.accent} />
      </View>

      {/* Summary row */}
      <View style={styles.statsRow}>
        <StatBadge label="Overdue" value={totals.overdue} color={Colors.statusRed} icon="warning" />
        <StatBadge label="Due Now" value={totals.due} color={Colors.statusAmber} icon="alert-circle-outline" />
        <StatBadge label="Urgent Reports" value={totals.urgent} color={Colors.accent} icon="hammer-outline" />
        <StatBadge label="Open Reports" value={totals.open} color={Colors.textMuted} icon="clipboard-outline" />
      </View>

      {isLoading && (
        <Text style={styles.loading}>Loading maintenance data...</Text>
      )}

      {vehicles.length === 0 && !isLoading && (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={40} color={Colors.statusGreen} />
          <Text style={styles.emptyTitle}>Fleet is in good shape</Text>
          <Text style={styles.emptyText}>No overdue or upcoming maintenance items.</Text>
        </View>
      )}

      {vehicles.map(vehicle => (
        <VehicleCard key={vehicle.vehicle_id} vehicle={vehicle} />
      ))}
    </ScrollView>
  );
}

function VehicleCard({ vehicle }: { vehicle: MaintenanceVehicle }) {
  const hasUrgent = vehicle.urgent_reports > 0;
  const hasOverdue = vehicle.alerts.some(a => a.alert_level === 'overdue');
  const borderColor = hasUrgent || hasOverdue ? Colors.statusRed : Colors.border;

  return (
    <View style={[styles.vehicleCard, { borderColor }]}>
      {/* Vehicle header */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleLeft}>
          <Ionicons name="bus-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.truckNumber}>Truck {vehicle.truck_number}</Text>
          {vehicle.make_model ? (
            <Text style={styles.makeModel}>{vehicle.make_model}</Text>
          ) : null}
        </View>
        <View style={styles.vehicleRight}>
          {vehicle.urgent_reports > 0 && (
            <View style={[styles.badge, { backgroundColor: Colors.statusRed + '33' }]}>
              <Text style={[styles.badgeText, { color: Colors.statusRed }]}>
                {vehicle.urgent_reports} URGENT
              </Text>
            </View>
          )}
          {vehicle.open_reports > 0 && (
            <Text style={styles.openReports}>{vehicle.open_reports} open</Text>
          )}
        </View>
      </View>

      <Text style={styles.odometer}>
        Odometer: {vehicle.current_odometer.toLocaleString()} mi
      </Text>

      {/* Alert items */}
      {vehicle.alerts.length === 0 ? (
        <View style={styles.allGoodRow}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.statusGreen} />
          <Text style={styles.allGoodText}>All maintenance items current</Text>
        </View>
      ) : (
        vehicle.alerts.map((alert, i) => (
          <AlertRow key={i} alert={alert} />
        ))
      )}
    </View>
  );
}

function AlertRow({ alert }: { alert: any }) {
  const color = ALERT_COLORS[alert.alert_level as keyof typeof ALERT_COLORS] ?? Colors.textMuted;
  const icon = ALERT_ICONS[alert.alert_level] ?? 'information-circle-outline';

  return (
    <View style={[styles.alertRow, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={16} color={color} />
      <View style={styles.alertInfo}>
        <View style={styles.alertTop}>
          <Text style={styles.alertDesc}>{alert.description}</Text>
          {alert.is_critical && (
            <Text style={[styles.criticalTag, { color }]}>CRITICAL</Text>
          )}
        </View>
        <Text style={[styles.alertLevel, { color }]}>{alert.alert_level.toUpperCase()}</Text>
        {alert.next_due_date && (
          <Text style={styles.alertMeta}>Due: {alert.next_due_date}</Text>
        )}
        {alert.next_due_odometer && (
          <Text style={styles.alertMeta}>
            Due at: {alert.next_due_odometer.toLocaleString()} mi
            {' '}(now: {alert.current_odometer.toLocaleString()} mi)
          </Text>
        )}
      </View>
    </View>
  );
}

function StatBadge({ label, value, color, icon }: any) {
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  statsRow: {
    flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8,
  },
  statBadge: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12,
    padding: 10, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  loading: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  emptyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 32, padding: 32, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  vehicleCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1,
  },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  vehicleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  truckNumber: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  makeModel: { color: Colors.textMuted, fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  openReports: { color: Colors.textMuted, fontSize: 12 },
  odometer: { color: Colors.textMuted, fontSize: 12, marginBottom: 10 },
  allGoodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  allGoodText: { color: Colors.statusGreen, fontSize: 13 },
  alertRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.bgInput, borderRadius: 8, padding: 10,
    marginTop: 6, borderLeftWidth: 3,
  },
  alertInfo: { flex: 1 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertDesc: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1 },
  criticalTag: { fontSize: 10, fontWeight: '800', marginLeft: 6 },
  alertLevel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  alertMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});