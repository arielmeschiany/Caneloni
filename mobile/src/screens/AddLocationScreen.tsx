import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { Category } from '@canaloni/shared';
import { CATEGORIES } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddLocation'>;
  route: RouteProp<RootStackParamList, 'AddLocation'>;
};

export function AddLocationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { coords, loading: geoLoading, error: geoError, getCurrentLocation } = useLocation();

  const initialLat = route.params?.lat;
  const initialLng = route.params?.lng;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('restaurant');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState(initialLat?.toFixed(6) ?? '');
  const [lng, setLng] = useState(initialLng?.toFixed(6) ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveLat = coords?.lat ?? (lat ? parseFloat(lat) : undefined);
  const effectiveLng = coords?.lng ?? (lng ? parseFloat(lng) : undefined);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    const ext = uri.split('.').pop() ?? 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: `image/${ext}` } as any);

    const { data, error } = await supabase.storage
      .from('location-photos')
      .upload(fileName, formData, { contentType: 'multipart/form-data' });

    if (error) return null;
    const { data: urlData } = supabase.storage.from('location-photos').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to pin a location.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }

    if (!name.trim()) { Alert.alert('Error', 'Please enter a name.'); return; }
    if (effectiveLat === undefined || effectiveLng === undefined) {
      Alert.alert('Error', 'Please set coordinates or use your current location.');
      return;
    }

    setLoading(true);
    let photo_url: string | null = null;
    if (photoUri) {
      photo_url = await uploadPhoto(photoUri);
    }

    const { error } = await supabase.from('locations').insert({
      name: name.trim(),
      category,
      description: description.trim(),
      lat: effectiveLat,
      lng: effectiveLng,
      photo_url,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Pinned! 📍', `"${name}" has been added to the map.`, [
        { text: 'Great!', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📍 Pin a Location</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Trattoria da Mario"
            placeholderTextColor="#3D2B1F55"
            maxLength={120}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.value}
                style={[styles.categoryBtn, category === c.value && styles.categoryBtnActive]}
                onPress={() => setCategory(c.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryBtnText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe this place…"
            placeholderTextColor="#3D2B1F55"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Coordinates */}
        <View style={styles.field}>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Coordinates *</Text>
            <TouchableOpacity onPress={getCurrentLocation} disabled={geoLoading}>
              <Text style={styles.geoBtn}>
                {geoLoading ? '📡 Locating…' : '📍 Use my location'}
              </Text>
            </TouchableOpacity>
          </View>
          {geoError && <Text style={styles.errorText}>{geoError}</Text>}
          <View style={styles.coordsRow}>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <TextInput
                style={[styles.input, styles.coordInput]}
                value={coords ? coords.lat.toFixed(6) : lat}
                onChangeText={setLat}
                placeholder="43.7711"
                placeholderTextColor="#3D2B1F44"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.coordField}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <TextInput
                style={[styles.input, styles.coordInput]}
                value={coords ? coords.lng.toFixed(6) : lng}
                onChangeText={setLng}
                placeholder="11.2486"
                placeholderTextColor="#3D2B1F44"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Photo */}
        <View style={styles.field}>
          <Text style={styles.label}>Photo (optional)</Text>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          )}
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} activeOpacity={0.7}>
            <Text style={styles.photoBtnText}>
              {photoUri ? '📷 Change photo' : '📷 Choose a photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Saving…' : '📌 Pin this Location'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: '#3D2B1F88' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#3D2B1F' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 18 },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  geoBtn: { fontSize: 12, color: '#C4622D', fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#3D2B1F22',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#3D2B1F',
    backgroundColor: '#FFFFFF',
  },
  textArea: { height: 88, textAlignVertical: 'top' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#3D2B1F22',
    backgroundColor: '#FFFFFF',
  },
  categoryBtnActive: {
    borderColor: '#C4622D',
    backgroundColor: '#C4622D15',
  },
  categoryBtnText: { fontSize: 13, fontWeight: '600', color: '#3D2B1F' },
  coordsRow: { flexDirection: 'row', gap: 8 },
  coordField: { flex: 1, gap: 4 },
  coordLabel: { fontSize: 11, color: '#3D2B1F66' },
  coordInput: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  errorText: { fontSize: 12, color: '#EF4444' },
  photoPreview: { height: 140, borderRadius: 12, backgroundColor: '#E8DDD0' },
  photoBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3D2B1F22',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 14, color: '#3D2B1F66', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#C4622D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#C4622D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
