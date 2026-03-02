'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import type { Location } from '@canaloni/shared';
import type { Category } from '@canaloni/shared';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/hooks/useGuest';
import { useHikingTrails } from '@/hooks/useHikingTrails';
import { AddLocationModal } from '@/components/Map/AddLocationModal';
import type { InitialPlace } from '@/components/Map/AddLocationModal';
import { LocationDetail } from '@/components/Location/LocationDetail';
import { AuthModal } from '@/components/Auth/AuthModal';
import { Header } from '@/components/UI/Header';
import { FilterBar } from '@/components/Map/FilterBar';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@canaloni/shared';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

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
  const { locations, loading: locationsLoading, addLocationOptimistic, removeLocation, refetch } = useLocations();
  const { user, signOut } = useAuth();
  const { guestName, setGuestName } = useGuest();
  const { trails, fetchTrails } = useHikingTrails();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showTrails, setShowTrails] = useState(false);
  const [showMyPins, setShowMyPins] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rightClickPlace, setRightClickPlace] = useState<InitialPlace | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
  }, [user]);

  // Auto-dismiss global error toast after 4s
  useEffect(() => {
    if (!globalError) return;
    const t = setTimeout(() => setGlobalError(null), 4000);
    return () => clearTimeout(t);
  }, [globalError]);

  // Filter locations: category → my pins
  const filteredLocations = (() => {
    let list = activeCategory === 'all'
      ? locations
      : locations.filter(l => l.category === activeCategory);

    if (showMyPins) {
      if (user) {
        list = list.filter(l => l.created_by === user.id);
      } else if (guestName) {
        list = list.filter(l => (l as any).guest_name === guestName);
      } else {
        list = [];
      }
    }

    return list;
  })();

  const handleAddButtonClick = useCallback(() => {
    if (!user && !guestName) {
      setShowAuthModal(true);
      return;
    }
    setRightClickPlace(null);
    setShowAddModal(true);
  }, [user, guestName]);

  const handleAuthRequired = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleToggleTrails = useCallback(() => {
    setShowTrails(prev => {
      const next = !prev;
      if (next) fetchTrails();
      return next;
    });
  }, [fetchTrails]);

  const handleToggleMyPins = useCallback(() => {
    setShowMyPins(prev => !prev);
    // Clear category filter when toggling My Pins for cleaner UX
    setActiveCategory('all');
  }, []);

  const handleRightClickAdd = useCallback((place: InitialPlace) => {
    if (!user && !guestName) {
      setShowAuthModal(true);
      return;
    }
    setRightClickPlace(place);
    setShowAddModal(true);
  }, [user, guestName]);

  const handleAddSuccess = useCallback(async (payload: any) => {
    // Modal has already closed itself; now optimistically insert
    try {
      await addLocationOptimistic(
        payload,
        user?.id ?? null,
        !user && guestName ? guestName : null
      );
    } catch (err: any) {
      setGlobalError(err.message ?? 'Failed to save location. Please try again.');
    }
  }, [addLocationOptimistic, user, guestName]);

  const handleLocationDeleted = useCallback((id: string) => {
    removeLocation(id);
    setSelectedLocation(null);
  }, [removeLocation]);

  const handleDeleteFromMap = useCallback((location: Location) => {
    removeLocation(location.id);
  }, [removeLocation]);

  const statsText = (() => {
    if (showMyPins) return `${filteredLocations.length} of your pin${filteredLocations.length !== 1 ? 's' : ''}`;
    if (activeCategory !== 'all') return `${filteredLocations.length} in category`;
    return `${filteredLocations.length} location${filteredLocations.length !== 1 ? 's' : ''} pinned`;
  })();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-cream">
      {/* Fixed header (contains search portal slot) */}
      <Header
        user={user}
        profile={profile}
        guestName={guestName}
        loading={locationsLoading}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={signOut}
      />

      {/* Map — fills entire screen, below header */}
      <div className="absolute inset-0 top-16">
        <MapView
          locations={filteredLocations}
          onLocationSelect={setSelectedLocation}
          onMapClick={() => {}}
          trails={trails}
          showTrails={showTrails}
          onRightClickAdd={handleRightClickAdd}
          userId={user?.id ?? null}
          userEmail={user?.email ?? null}
          adminEmail={ADMIN_EMAIL}
          onDeleteRequest={handleDeleteFromMap}
        />
      </div>

      {/* Filter bar */}
      <div className="absolute top-16 left-0 right-0 z-10 px-3 py-2">
        <FilterBar
          activeCategory={activeCategory}
          onCategoryChange={cat => { setActiveCategory(cat); setShowMyPins(false); }}
          showTrails={showTrails}
          onToggleTrails={handleToggleTrails}
          showMyPins={showMyPins}
          onToggleMyPins={handleToggleMyPins}
        />
      </div>

      {/* Floating trails toggle — top-left of map */}
      <div className="absolute top-28 left-4 z-10">
        <button
          onClick={handleToggleTrails}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-tuscany text-xs font-semibold transition-colors ${
            showTrails
              ? 'bg-olive text-white'
              : 'bg-white/95 text-brown border border-cream-dark hover:bg-white'
          }`}
        >
          🥾 {showTrails ? 'Trails ON' : 'Trails'}
        </button>
      </div>

      {/* FAB — Add location */}
      <button
        onClick={handleAddButtonClick}
        className="absolute bottom-32 right-4 z-10 w-14 h-14 bg-terracotta text-white rounded-full shadow-tuscany-lg text-3xl flex items-center justify-center hover:bg-terracotta-dark active:scale-95 transition-all"
        aria-label="Add a location"
      >
        +
      </button>

      {/* Global error toast */}
      {globalError && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white text-sm text-center py-3 px-4 animate-slide-up">
          ⚠️ {globalError}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddLocationModal
          onClose={() => { setShowAddModal(false); setRightClickPlace(null); }}
          onSuccess={handleAddSuccess}
          onAuthRequired={handleAuthRequired}
          initialPlace={rightClickPlace ?? undefined}
        />
      )}

      {selectedLocation && (
        <LocationDetail
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onAuthRequired={handleAuthRequired}
          onLocationDeleted={handleLocationDeleted}
          onRefetch={refetch}
          guestName={guestName}
          username={profile?.username}
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
