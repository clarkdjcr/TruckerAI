import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { maintenanceApi } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';
import { MaintenanceAlert } from '../../src/types';

const MAINTENANCE_TYPES = [
  { value: 'tire_replace', label: 'Tires', icon: 'ellipse-outline' },
  { value: 'brake', label: 'Brakes', icon: 'hand-left-outline' },
  { value: 'oil', label: 'Oil', icon: 'water-outline' },
  { value: 'engine', label: 'Engine', icon: 'flash-outline' },
  { value: 'elec', label: 'Electrical', icon: 'battery-charging-outline' },
  { value: 'coolant', label: 'Coolant', icon: 'thermometer-outline' },
  { value: 'repair', label: 'Repair', icon: 'hammer-outline' },
  { value: 'other', label: 'Other', icon: 'build-outline' },
] as const;

const ALERT_COLORS = {
  overdue: Colors.statusRed,
  due: Colors.statusAmber,
  approaching: Colors.primary,
};

export default function DriverMaintenance() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('repair');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const { data: alertsData } = useQuery({
    queryKey: ['maintenance-alerts'],
    queryFn: () => maintenanceApi.alerts().then(r => r.data as { alerts: MaintenanceAlert[] }),
    refetchInterval: 10 * 60_000,
  });

  const { data: reportsData } = useQuery({
    queryKey: ['my-maintenance-records'],
    queryFn: () => maintenanceApi.records({ limit: 10 }).then(r => r.data),
    refetchInterval: 5 * 60_000,
  });

  const alerts: MaintenanceAlert[] = alertsData?.alerts ?? [];
  const reports = reportsData ?? [];

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Please describe the issue.');
      const record = await maintenanceApi.createRecord({
        maintenance_type: selectedType,
        description: description.trim(),
        is_urgent: isUrgent,
        driver_notes: 'Reported via mobile app',
      });
      // Upload photos if any
      if (photos.length > 0) {
        const fd = new FormData();
        photos.forEach((uri, i) => {
          fd.append('photos', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any);
        });
        await maintenanceApi.uploadPhotos(record.data.id, fd);
      }
    },
    onSuccess: () => {
      setShowForm(false);
      setDescription('');
      setIsUrgent(false);
      setPhotos([]);
      qc.invalidateQueries({ queryKey: ['my-maintenance-records'] });
      Alert.alert('Report Submitted', isUrgent ? 'Your dispatcher has been notified.' : 'Issue logged successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Could not submit report.'),
  });

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Photo limit', 'Maximum 4 photos per report.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 4) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Truck</Text>
          <Text style={styles.subtitle}>Maintenance & Alerts</Text>
        </View>
        <Ionicons name="construct-outline" size={28} color={Colors.accent} />
      </View>

      {/* Alerts for this driver's truck */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MAINTENANCE ALERTS</Text>
          {alerts.map((alert, i) => {
            const color = ALERT_COLORS[alert.alert_level] ?? Colors.textMuted;
            return (
              <View key={i} style={[styles.alertCard, { borderLeftColor: color }]}>
                <Ionicons
                  name={alert.alert_level === 'overdue' ? 'warning' : 'alert-circle-outline'}
                  size={18}
                  color={color}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertDesc}>{alert.description}</Text>
                  <Text style={[styles.alertLevel, { color }]}>
                    {alert.alert_level.toUpperCase()}
                    {alert.is_critical ? ' — CRITICAL' : ''}
                  </Text>
                  {alert.next_due_date && (
                    <Text style={styles.alertMeta}>Due: {alert.next_due_date}</Text>
                  )}
                  {alert.next_due_odometer && (
                    <Text style={styles.alertMeta}>Due at {alert.next_due_odometer.toLocaleString()} mi</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {alerts.length === 0 && (
        <View style={styles.allGoodCard}>
          <Ionicons name="checkmark-circle" size={32} color={Colors.statusGreen} />
          <Text style={styles.allGoodText}>No maintenance items due on your truck.</Text>
        </View>
      )}

      {/* Report new issue */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'chevron-up' : 'add-circle-outline'} size={20} color={Colors.white} />
          <Text style={styles.reportBtnText}>{showForm ? 'Cancel Report' : 'Report an Issue'}</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.reportForm}>
            {/* Type selector */}
            <Text style={styles.formLabel}>Issue Type</Text>
            <View style={styles.typeGrid}>
              {MAINTENANCE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeBtn, selectedType === t.value && styles.typeBtnActive]}
                  onPress={() => setSelectedType(t.value)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={18}
                    color={selectedType === t.value ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.typeLabel, selectedType === t.value && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue (noise, warning light, leak, etc.)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Urgent toggle */}
            <View style={styles.urgentRow}>
              <View>
                <Text style={styles.formLabel}>Safety Critical?</Text>
                <Text style={styles.urgentHint}>Dispatcher will be notified immediately</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ true: Colors.statusRed, false: Colors.bgInput }}
                thumbColor={isUrgent ? Colors.white : Colors.textMuted}
              />
            </View>

            {/* Photos */}
            <Text style={styles.formLabel}>Photos ({photos.length}/4)</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={22} color={Colors.textSecondary} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ionicons name="images-outline" size={22} color={Colors.textSecondary} />
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
              {photos.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.photoBtn, { backgroundColor: Colors.primary + '33' }]}
                  onPress={() => setPhotos(prev => prev.filter((__, j) => j !== i))}
                >
                  <Ionicons name="image" size={22} color={Colors.primary} />
                  <Text style={[styles.photoBtnText, { color: Colors.primaryLight }]}>#{i + 1} ×</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isUrgent && styles.submitBtnUrgent]}
              onPress={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color={Colors.white} />
                  <Text style={styles.submitBtnText}>
                    {isUrgent ? 'Submit Urgent Report' : 'Submit Report'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent reports */}
      {reports.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY RECENT REPORTS</Text>
          {reports.map((r: any) => (
            <View key={r.id} style={styles.reportCard}>
              <View style={styles.reportTop}>
                <Text style={styles.reportType}>{r.maintenance_type?.toUpperCase()}</Text>
                <View style={[styles.statusPill, { backgroundColor: r.record_status === 'completed' ? Colors.statusGreen + '22' : Colors.statusAmber + '22' }]}>
                  <Text style={{ color: r.record_status === 'completed' ? Colors.statusGreen : Colors.statusAmber, fontSize: 11, fontWeight: '700' }}>
                    {r.record_status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.reportDesc}>{r.description}</Text>
              <Text style={styles.reportDate}>
                {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  section: { marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  alertCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 3,
  },
  alertDesc: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  alertLevel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  alertMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  allGoodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  allGoodText: { color: Colors.statusGreen, fontSize: 14 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14,
  },
  reportBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  reportForm: {
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16,
    marginTop: 12, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  formLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeLabel: { color: Colors.textSecondary, fontSize: 12 },
  typeLabelActive: { color: Colors.white, fontWeight: '600' },
  textArea: {
    backgroundColor: Colors.bgInput, borderRadius: 10, padding: 12,
    color: Colors.textPrimary, fontSize: 14, height: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  urgentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  urgentHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoBtn: {
    backgroundColor: Colors.bgInput, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 4, minWidth: 70,
    borderWidth: 1, borderColor: Colors.border,
  },
  photoBtnText: { color: Colors.textMuted, fontSize: 11 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 10, padding: 14,
  },
  submitBtnUrgent: { backgroundColor: Colors.statusRed },
  submitBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  reportCard: {
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportType: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reportDesc: { color: Colors.textPrimary, fontSize: 14 },
  reportDate: { color: Colors.textMuted, fontSize: 12 },
});