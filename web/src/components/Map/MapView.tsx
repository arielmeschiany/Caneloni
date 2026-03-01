'use client';

import { useState, useCallback, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import type { Location } from '@canaloni/shared';
import { TUSCANY_CENTER, DEFAULT_ZOOM, CATEGORY_COLORS, CATEGORY_EMOJIS } from '@canaloni/shared';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { formatRating } from '@canaloni/shared';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#3D2B1F' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5ebe0' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9b2a6' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dde1d3' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#c5dab0' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7C3A' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fdfcf9' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8c967' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e9bc62' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E8DDD0' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#a2bfd5' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5b8aa8' }] },
  ],
};

function createMarkerIcon(category: string, selected = false): google.maps.Symbol {
  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ?? '#C4622D';
  const scale = selected ? 12 : 9;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: selected ? 3 : 2,
    scale,
  };
}

interface MapViewProps {
  locations: Location[];
  onLocationSelect: (location: Location) => void;
  onMapClick: (lat: number, lng: number) => void;
}

export function MapView({ locations, onLocationSelect, onMapClick }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: [],
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      setSelectedLocation(null);
      onMapClick(e.latLng.lat(), e.latLng.lng());
    },
    [onMapClick]
  );

  const handleMarkerClick = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
    },
    []
  );

  const handleInfoWindowClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleOpenDetail = useCallback(
    (location: Location) => {
      setSelectedLocation(null);
      onLocationSelect(location);
    },
    [onLocationSelect]
  );

  if (loadError) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-cream text-brown/60">
        <div className="text-center p-6">
          <p className="text-xl mb-2">🗺️</p>
          <p className="font-medium">Map failed to load</p>
          <p className="text-sm mt-1">Check your Google Maps API key in .env.local</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-cream">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-terracotta border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brown/60 text-sm">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={TUSCANY_CENTER}
      zoom={DEFAULT_ZOOM}
      options={MAP_OPTIONS}
      onLoad={handleMapLoad}
      onClick={handleMapClick}
    >
      {locations.map(location => (
        <Marker
          key={location.id}
          position={{ lat: location.lat, lng: location.lng }}
          icon={createMarkerIcon(location.category, selectedLocation?.id === location.id)}
          title={location.name}
          onClick={() => handleMarkerClick(location)}
        />
      ))}

      {selectedLocation && (
        <InfoWindow
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          onCloseClick={handleInfoWindowClose}
          options={{ pixelOffset: new google.maps.Size(0, -12) }}
        >
          <div className="p-1 max-w-[240px]">
            <div className="mb-1">
              <CategoryBadge category={selectedLocation.category} size="sm" />
            </div>
            <h3 className="font-serif font-bold text-brown text-base leading-tight mb-1">
              {selectedLocation.name}
            </h3>
            {selectedLocation.avg_rating !== null && selectedLocation.avg_rating !== undefined ? (
              <div className="flex items-center gap-1.5 mb-2">
                <StarRating rating={selectedLocation.avg_rating} size="sm" />
                <span className="text-xs font-semibold text-amber-600">
                  {formatRating(selectedLocation.avg_rating)}
                </span>
              </div>
            ) : null}
            {selectedLocation.description && (
              <p className="text-xs text-brown/60 mb-2 line-clamp-2">{selectedLocation.description}</p>
            )}
            <button
              onClick={() => handleOpenDetail(selectedLocation)}
              className="text-xs font-semibold text-terracotta hover:underline"
            >
              View details & reviews →
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
