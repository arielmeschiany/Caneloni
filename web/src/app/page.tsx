'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import type { Location } from '@canaloni/shared';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/hooks/useGuest';
import { AddLocationModal } from '@/components/Map/AddLocationModal';
import { LocationDetail } from '@/components/Location/LocationDetail';
import { AuthModal } from '@/components/Auth/AuthModal';
import Link from 'next/link';

// Dynamic import with SSR disabled (Google Maps requires browser APIs)
const MapView = dynamic(
  () => import('@/components/Map/MapView').then(m => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-cream">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-terracotta border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-brown/60 text-sm">Loading map…</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const { locations, loading: locationsLoading, addLocation } = useLocations();
  const { user, signOut } = useAuth();
  const { guestName, setGuestName } = useGuest();

  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | undefined>();
  const [pendingLng, setPendingLng] = useState<number | undefined>();
  const [pendingName, setPendingName] = useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingLat(lat);
    setPendingLng(lng);
    setPendingName(undefined);
  }, []);

  const handleAddButtonClick = useCallback(() => {
    if (!user && !guestName) {
      setShowAuthModal(true);
      return;
    }
    setShowAddModal(true);
  }, [user, guestName]);

  const handleAuthRequired = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleSearchSelect = useCallback((lat: number, lng: number, name: string) => {
    setPendingLat(lat);
    setPendingLng(lng);
    setPendingName(name);
    setShowAddModal(true);
  }, []);

  const categoryCount = locations.reduce<Record<string, number>>((acc, loc) => {
    acc[loc.category] = (acc[loc.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-cream">
      {/* Map — fills entire screen */}
      <div className="absolute inset-0">
        <MapView
          locations={locations}
          onLocationSelect={setSelectedLocation}
          onMapClick={handleMapClick}
          onSearchSelect={handleSearchSelect}
        />
      </div>

      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-tuscany px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <div>
              <h1 className="font-serif font-bold text-brown text-lg leading-none">Canaloni</h1>
              <p className="text-brown/50 text-xs">Discover Tuscany</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {locationsLoading && (
              <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="text-sm text-brown/70 hover:text-brown font-medium transition-colors"
                >
                  {user.email?.split('@')[0]}
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-brown/50 hover:text-terracotta transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : guestName ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-brown/70 font-medium">{guestName} (Guest)</span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs text-terracotta hover:underline transition-colors"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm text-terracotta font-semibold hover:underline transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats pill */}
      <div className="absolute top-20 left-4 right-4 z-10 flex flex-wrap gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-tuscany px-3 py-1.5 text-xs text-brown/60 font-medium">
          {locations.length} location{locations.length !== 1 ? 's' : ''} pinned
        </div>
        {Object.entries(categoryCount).map(([cat, count]) => (
          <div key={cat} className="bg-white/80 backdrop-blur-sm rounded-full shadow-tuscany px-3 py-1.5 text-xs text-brown/60">
            {count} {cat}
          </div>
        ))}
      </div>

      {/* Click-to-add hint */}
      {pendingLat !== undefined && !showAddModal && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white rounded-xl shadow-tuscany px-4 py-2.5 flex items-center gap-3 animate-slide-up">
            <span className="text-sm text-brown/70">📍 {pendingLat.toFixed(4)}, {pendingLng?.toFixed(4)}</span>
            <button
              onClick={handleAddButtonClick}
              className="text-sm font-semibold text-terracotta hover:underline"
            >
              Pin here →
            </button>
            <button
              onClick={() => { setPendingLat(undefined); setPendingLng(undefined); setPendingName(undefined); }}
              className="text-brown/30 hover:text-brown/60 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* FAB — Add location (above Google Maps zoom controls) */}
      <button
        onClick={handleAddButtonClick}
        className="absolute bottom-32 right-4 z-10 w-14 h-14 bg-terracotta text-white rounded-full shadow-tuscany-lg text-3xl flex items-center justify-center hover:bg-terracotta-dark active:scale-95 transition-all"
        aria-label="Add a location"
      >
        +
      </button>

      {/* Modals */}
      {showAddModal && (
        <AddLocationModal
          initialLat={pendingLat}
          initialLng={pendingLng}
          initialName={pendingName}
          onClose={() => { setShowAddModal(false); setPendingLat(undefined); setPendingLng(undefined); setPendingName(undefined); }}
          onSuccess={() => { setPendingLat(undefined); setPendingLng(undefined); setPendingName(undefined); }}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {selectedLocation && (
        <LocationDetail
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onAuthRequired={handleAuthRequired}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onContinueAsGuest={(name) => { setGuestName(name); setShowAuthModal(false); }}
        />
      )}
    </div>
  );
}
