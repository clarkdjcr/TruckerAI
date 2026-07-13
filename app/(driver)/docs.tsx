import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { Colors } from '../../src/theme/colors';

const DOC_TYPES = [
  { value: 'BOL', label: 'Bill of Lading', icon: 'document-text' },
  { value: 'POD', label: 'Proof of Delivery', icon: 'checkmark-circle' },
  { value: 'RATE_CON', label: 'Rate Confirmation', icon: 'cash' },
  { value: 'FUEL_RECEIPT', label: 'Fuel Receipt', icon: 'car' },
  { value: 'SCALE_TICKET', label: 'Scale Ticket', icon: 'speedometer' },
  { value: 'LOG', label: 'Paper Log', icon: 'time' },
  { value: 'OTHER', label: 'Other', icon: 'folder' },
] as const;

export default function DocsScreen() {
  const [selectedType, setSelectedType] = useState<string>('BOL');
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);

  const pickAndUpload = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera/library access is needed to scan documents.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: `doc_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);
      formData.append('doc_type', selectedType);

      await api.post('/loads/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRecentUploads(prev => [asset.uri, ...prev.slice(0, 4)]);
      Alert.alert('Uploaded', `${selectedType} uploaded successfully.`);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload document. Try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const scanPaperLog = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        name: `log_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);
      await api.post('/compliance/scan-log/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Log Scanned', 'Paper log processed and added to your HOS records.');
    } catch {
      Alert.alert('Scan Failed', 'Could not process the log. Try better lighting or a flatter surface.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>Scan & upload load documents</Text>
      </View>

      {/* Doc Type Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Document Type</Text>
        <View style={styles.typeGrid}>
          {DOC_TYPES.map(dt => (
            <TouchableOpacity
              key={dt.value}
              style={[styles.typeBtn, selectedType === dt.value && styles.typeBtnActive]}
              onPress={() => setSelectedType(dt.value)}
            >
              <Ionicons
                name={dt.icon as any}
                size={18}
                color={selectedType === dt.value ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.typeLabel, selectedType === dt.value && styles.typeLabelActive]}>
                {dt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Upload Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => pickAndUpload(true)}
            disabled={isUploading}
          >
            <Ionicons name="camera" size={28} color={Colors.primary} />
            <Text style={styles.uploadLabel}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => pickAndUpload(false)}
            disabled={isUploading}
          >
            <Ionicons name="image" size={28} color={Colors.primary} />
            <Text style={styles.uploadLabel}>Photo Library</Text>
          </TouchableOpacity>
        </View>
        {isUploading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.uploadingText}>Uploading to cloud...</Text>
          </View>
        )}
      </View>

      {/* Paper Log OCR */}
      <View style={[styles.card, styles.logCard]}>
        <View style={styles.logHeader}>
          <Ionicons name="scan" size={22} color={Colors.accent} />
          <Text style={[styles.cardTitle, { marginBottom: 0, color: Colors.accentLight }]}>
            Paper Log Scanner
          </Text>
        </View>
        <Text style={styles.logDesc}>
          Snap a photo of your paper HOS log. TruckerAI reads it with OCR and automatically records your hours.
        </Text>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={scanPaperLog}
          disabled={isUploading}
        >
          <Ionicons name="camera-outline" size={20} color={Colors.white} />
          <Text style={styles.logBtnText}>Scan Paper Log</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Uploads</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
            {recentUploads.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.bgInput, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeLabel: { color: Colors.textSecondary, fontSize: 13 },
  typeLabelActive: { color: Colors.white },
  actionRow: { flexDirection: 'row', gap: 12 },
  uploadBtn: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 20,
    backgroundColor: Colors.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  uploadLabel: { color: Colors.textSecondary, fontSize: 13 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  uploadingText: { color: Colors.textSecondary, fontSize: 14 },
  logCard: { borderColor: Colors.accent + '55' },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  logDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14,
  },
  logBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  thumbScroll: { marginTop: 4 },
  thumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
});