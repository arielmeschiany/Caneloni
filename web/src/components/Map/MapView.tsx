'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Autocomplete,
  Polyline,
} from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import type { Location } from '@canaloni/shared';
import { TUSCANY_CENTER, DEFAULT_ZOOM } from '@canaloni/shared';
import { createMarkerIcon } from '@/lib/mapIcons';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { formatRating } from '@canaloni/shared';
import type { HikingTrail } from '@/hooks/useHikingTrails';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const LIBRARIES: Libraries = ['places'];

const TUSCANY_BOUNDS = {
  south: 42.3,
  west: 9.7,
  north: 44.5,
  east: 12.4,
};

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

interface MapViewProps {
  locations: Location[];
  onLocationSelect: (location: Location) => void;
  onMapClick: (lat: number, lng: number) => void;
  onSearchSelect?: (lat: number, lng: number, name: string) => void;
  trails?: HikingTrail[];
  showTrails?: boolean;
}

export function MapView({ locations, onLocationSelect, onMapClick, onSearchSelect, trails = [], showTrails = false }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<HikingTrail | null>(null);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Attach search portal once mounted
  useEffect(() => {
    if (isLoaded) {
      setPortalTarget(document.getElementById('header-search-portal'));
    }
  }, [isLoaded]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      setSelectedLocation(null);
      setSelectedTrail(null);
      onMapClick(e.latLng.lat(), e.latLng.lng());
    },
    [onMapClick]
  );

  const handleMarkerClick = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
      setSelectedTrail(null);
    },
    []
  );

  const handleInfoWindowClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleTrailInfoClose = useCallback(() => {
    setSelectedTrail(null);
  }, []);

  const handleOpenDetail = useCallback(
    (location: Location) => {
      setSelectedLocation(null);
      onLocationSelect(location);
    },
    [onLocationSelect]
  );

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name ?? '';
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(16);
    setSearchMarker({ lat, lng, name });
  }, []);

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
    <div className="relative w-full h-full">
      {/* Portal the Autocomplete search into the header slot */}
      {portalTarget && (createPortal(
        <Autocomplete
          onLoad={ac => { autocompleteRef.current = ac; }}
          bounds={TUSCANY_BOUNDS}
          options={{ strictBounds: false }}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            type="text"
            placeholder="Search in Tuscany…"
            className="w-full h-9 rounded-xl shadow-tuscany px-4 text-sm text-brown bg-white/95 outline-none border border-cream-dark focus:border-terracotta transition-colors"
          />
        </Autocomplete>,
        portalTarget
      ) as React.ReactNode)}

      {/* Save callout above search marker */}
      {searchMarker && onSearchSelect && (
        <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <div className="bg-white rounded-xl shadow-tuscany-lg px-4 py-2.5 flex items-center gap-3 animate-slide-up">
            <span className="text-sm text-brown/70">📍 {searchMarker.name}</span>
            <button
              onClick={() => {
                onSearchSelect(searchMarker.lat, searchMarker.lng, searchMarker.name);
                setSearchMarker(null);
              }}
              className="text-sm font-semibold text-terracotta hover:underline"
            >
              Save →
            </button>
            <button
              onClick={() => setSearchMarker(null)}
              className="text-brown/30 hover:text-brown/60 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={TUSCANY_CENTER}
        zoom={DEFAULT_ZOOM}
        options={MAP_OPTIONS}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
      >
        {/* Location markers */}
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

        {/* Search result marker */}
        {searchMarker && (
          <Marker
            position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
            animation={google.maps.Animation.DROP}
          />
        )}

        {/* Hiking trail polylines */}
        {showTrails && trails.map(trail => (
          <Polyline
            key={trail.id}
            path={trail.coordinates}
            options={{
              strokeColor: '#5C8A3A',
              strokeOpacity: 0.75,
              strokeWeight: 3,
              clickable: true,
            }}
            onClick={() => setSelectedTrail(trail)}
          />
        ))}

        {/* Trail info window */}
        {selectedTrail && selectedTrail.coordinates.length > 0 && (() => {
          const mid = selectedTrail.coordinates[Math.floor(selectedTrail.coordinates.length / 2)];
          return (
            <InfoWindow
              position={mid}
              onCloseClick={handleTrailInfoClose}
            >
              <div className="p-1 max-w-[200px]">
                <p className="font-semibold text-brown text-sm mb-0.5">🥾 {selectedTrail.name || 'Unnamed Trail'}</p>
                {selectedTrail.distance && (
                  <p className="text-xs text-brown/60">{(selectedTrail.distance / 1000).toFixed(1)} km</p>
                )}
                {selectedTrail.difficulty && (
                  <p className="text-xs text-brown/60">Difficulty: {selectedTrail.difficulty}</p>
                )}
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );
}
