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
import type { Location, Category } from '@canaloni/shared';
import { TUSCANY_CENTER, DEFAULT_ZOOM } from '@canaloni/shared';
import { createMarkerIcon } from '@/lib/mapIcons';
import type { HikingTrail } from '@/hooks/useHikingTrails';
import type { InitialPlace } from './AddLocationModal';

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

const TYPE_TO_CATEGORY: Record<string, Category> = {
  restaurant: 'classic_italian',
  cafe: 'classic_italian',
  bakery: 'classic_italian',
  bar: 'classic_italian',
  food: 'classic_italian',
  pizza_restaurant: 'pizzeria',
  meal_delivery: 'classic_italian',
  meal_takeaway: 'classic_italian',
  lodging: 'hotels',
  museum: 'museums_galleries',
  art_gallery: 'museums_galleries',
  tourist_attraction: 'sightseeing',
  point_of_interest: 'sightseeing',
  natural_feature: 'views_panoramas',
  park: 'walking_trails',
  beach: 'beaches',
  pharmacy: 'pharmacy',
  grocery_or_supermarket: 'local_markets',
  market: 'local_markets',
  transit_station: 'train_station',
  train_station: 'train_station',
  taxi_stand: 'taxi_station',
};

function googleTypesToCategory(types: string[]): Category | undefined {
  for (const t of types) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  }
  return undefined;
}

interface MapViewProps {
  locations: Location[];
  selectedLocationId?: string | null;
  onLocationSelect: (location: Location) => void;
  onMapClick: (lat: number, lng: number) => void;
  trails?: HikingTrail[];
  showTrails?: boolean;
  onRightClickAdd?: (place: InitialPlace) => void;
}

export function MapView({
  locations,
  selectedLocationId,
  onLocationSelect,
  onMapClick,
  trails = [],
  showTrails = false,
  onRightClickAdd,
}: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [selectedTrail, setSelectedTrail] = useState<HikingTrail | null>(null);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const rightClickHandlerRef = useRef<((lat: number, lng: number, placeId?: string) => void) | null>(null);

  useEffect(() => {
    if (isLoaded) setPortalTarget(document.getElementById('header-search-portal'));
  }, [isLoaded]);

  const handleRightClickAction = useCallback((lat: number, lng: number, placeId?: string) => {
    if (!onRightClickAdd) return;

    if (placeId && mapRef.current) {
      const service = new google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        { placeId, fields: ['name', 'formatted_address', 'types', 'geometry'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const placeLat = place.geometry?.location?.lat() ?? lat;
            const placeLng = place.geometry?.location?.lng() ?? lng;
            onRightClickAdd({
              lat: placeLat,
              lng: placeLng,
              name: place.name ?? undefined,
              address: place.formatted_address ?? undefined,
              category: googleTypesToCategory(place.types ?? []),
            });
          } else {
            onRightClickAdd({ lat, lng });
          }
        }
      );
    } else {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const address = status === 'OK' && results?.[0]?.formatted_address
          ? results[0].formatted_address
          : undefined;
        onRightClickAdd({ lat, lng, address });
      });
    }
  }, [onRightClickAdd]);

  // Keep ref in sync — used inside native event listener closures
  useEffect(() => {
    rightClickHandlerRef.current = handleRightClickAction;
  }, [handleRightClickAction]);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Native rightclick listener — more reliable than React prop for capturing placeId on POIs
    map.addListener('rightclick', (e: any) => {
      if (e.latLng) {
        rightClickHandlerRef.current?.(e.latLng.lat(), e.latLng.lng(), e.placeId ?? undefined);
      }
    });

    // Mobile long-press: record touch start, fire after 600ms if finger hasn't moved
    const mapDiv = map.getDiv();
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let touchStartX = 0;
    let touchStartY = 0;

    mapDiv.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        const rect = mapDiv.getBoundingClientRect();
        const relX = touchStartX - rect.left;
        const relY = touchStartY - rect.top;
        const projection = map.getProjection();
        const bounds = map.getBounds();
        if (!projection || !bounds) return;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const nePx = projection.fromLatLngToPoint(ne)!;
        const swPx = projection.fromLatLngToPoint(sw)!;
        const worldX = swPx.x + (relX / rect.width) * (nePx.x - swPx.x);
        const worldY = nePx.y + (relY / rect.height) * (swPx.y - nePx.y);
        const latLng = projection.fromPointToLatLng(new google.maps.Point(worldX, worldY));
        if (latLng) rightClickHandlerRef.current?.(latLng.lat(), latLng.lng(), undefined);
      }, 600);
    }, { passive: true });

    mapDiv.addEventListener('touchend', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }, { passive: true });

    mapDiv.addEventListener('touchmove', (e: TouchEvent) => {
      if (longPressTimer && e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 8 || dy > 8) { clearTimeout(longPressTimer); longPressTimer = null; }
      }
    }, { passive: true });
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setSelectedTrail(null);
    onMapClick(e.latLng.lat(), e.latLng.lng());
  }, [onMapClick]);

  // Marker click opens detail panel directly — no intermediate tooltip
  const handleMarkerClick = useCallback((location: Location) => {
    onLocationSelect(location);
  }, [onLocationSelect]);

  const handleTrailInfoClose = useCallback(() => setSelectedTrail(null), []);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(16);
    setSearchMarker({ lat, lng, name: place.name ?? '' });
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
      {/* Portal search into header */}
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

      {/* Search result callout */}
      {searchMarker && (
        <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <div className="bg-white rounded-xl shadow-tuscany-lg px-4 py-2.5 flex items-center gap-3 animate-slide-up">
            <span className="text-sm text-brown/70">📍 {searchMarker.name || 'Selected location'}</span>
            <button
              onClick={() => {
                onRightClickAdd?.({ lat: searchMarker.lat, lng: searchMarker.lng, name: searchMarker.name });
                setSearchMarker(null);
              }}
              className="text-sm font-semibold text-terracotta hover:underline"
            >
              Pin →
            </button>
            <button onClick={() => setSearchMarker(null)} className="text-brown/30 hover:text-brown/60 text-lg leading-none">×</button>
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
        {locations.map(location => (
          <Marker
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            icon={createMarkerIcon(location.category, selectedLocationId === location.id)}
            title={location.name}
            onClick={() => handleMarkerClick(location)}
          />
        ))}

        {searchMarker && (
          <Marker
            position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
            animation={google.maps.Animation.DROP}
          />
        )}

        {showTrails && trails.map(trail => (
          <Polyline
            key={trail.id}
            path={trail.coordinates}
            options={{ strokeColor: '#5C8A3A', strokeOpacity: 0.75, strokeWeight: 3, clickable: true }}
            onClick={() => setSelectedTrail(trail)}
          />
        ))}

        {selectedTrail && selectedTrail.coordinates.length > 0 && (() => {
          const mid = selectedTrail.coordinates[Math.floor(selectedTrail.coordinates.length / 2)];
          return (
            <InfoWindow position={mid} onCloseClick={handleTrailInfoClose}>
              <div style={{ padding: '4px', maxWidth: '200px' }}>
                <p style={{ fontWeight: 600, color: '#3D2B1F', fontSize: '13px', margin: '0 0 2px 0' }}>🥾 {selectedTrail.name || 'Unnamed Trail'}</p>
                {selectedTrail.distance && (
                  <p style={{ fontSize: '12px', color: '#6b5b4e', margin: '0' }}>{(selectedTrail.distance / 1000).toFixed(1)} km</p>
                )}
                {selectedTrail.difficulty && (
                  <p style={{ fontSize: '12px', color: '#6b5b4e', margin: '0' }}>Difficulty: {selectedTrail.difficulty}</p>
                )}
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );
}
