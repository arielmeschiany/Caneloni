import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Location } from '@canaloni/shared';
import { TUSCANY_CENTER, CATEGORY_COLORS } from '@canaloni/shared';
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MapScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Map'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = { navigation: MapScreenNavigationProp };

const INITIAL_REGION: Region = {
  latitude: TUSCANY_CENTER.lat,
  longitude: TUSCANY_CENTER.lng,
  latitudeDelta: 1.8,
  longitudeDelta: 1.8,
};

export function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locations, loading } = useLocations();
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  const googleMapsApiKey =
    Constants.expoConfig?.extra?.googleMapsApiKey ?? 'PASTE_YOUR_GOOGLE_MAPS_KEY_HERE';

  const handleMapPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingCoords({ lat: latitude, lng: longitude });
  }, []);

  const handleMarkerPress = useCallback(
    (location: Location) => {
      navigation.navigate('LocationDetail', { locationId: location.id });
    },
    [navigation]
  );

  const handleAddLocationPress = useCallback(() => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('AddLocation', {
      lat: pendingCoords?.lat,
      lng: pendingCoords?.lng,
    });
    setPendingCoords(null);
  }, [user, navigation, pendingCoords]);

  const handlePinHerePress = useCallback(() => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('AddLocation', {
      lat: pendingCoords?.lat,
      lng: pendingCoords?.lng,
    });
    setPendingCoords(null);
  }, [user, navigation, pendingCoords]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={mapStyle}
      >
        {locations.map(location => (
          <Marker
            key={location.id}
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            title={location.name}
            description={location.description ?? undefined}
            pinColor={CATEGORY_COLORS[location.category] ?? '#C4622D'}
            onPress={() => handleMarkerPress(location)}
          />
        ))}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.topBarContent}>
          <Text style={styles.appName}>🏛️ Canaloni</Text>
          {loading && <ActivityIndicator size="small" color="#C4622D" />}
          <Text style={styles.locationCount}>{locations.length} pins</Text>
        </View>
      </View>

      {/* Pending coords tooltip */}
      {pendingCoords && (
        <View style={[styles.tooltip, { bottom: insets.bottom + 90 }]}>
          <Text style={styles.tooltipCoords}>
            📍 {pendingCoords.lat.toFixed(4)}, {pendingCoords.lng.toFixed(4)}
          </Text>
          <TouchableOpacity onPress={handlePinHerePress} activeOpacity={0.8}>
            <Text style={styles.tooltipAction}>Pin here →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPendingCoords(null)} style={styles.tooltipClose}>
            <Text style={styles.tooltipCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={handleAddLocationPress}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#3D2B1F' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dde1d3' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#c5dab0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8c967' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a2bfd5' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  topBarContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: { fontSize: 16, fontWeight: '800', color: '#3D2B1F' },
  locationCount: { fontSize: 12, color: '#3D2B1F88', fontWeight: '500' },
  tooltip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3D2B1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  tooltipCoords: { fontSize: 12, color: '#3D2B1F88', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  tooltipAction: { fontSize: 13, color: '#C4622D', fontWeight: '700' },
  tooltipClose: { paddingHorizontal: 4 },
  tooltipCloseText: { fontSize: 18, color: '#3D2B1F44', lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C4622D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4622D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: { fontSize: 30, color: '#FFFFFF', lineHeight: 34, fontWeight: '300' },
});
