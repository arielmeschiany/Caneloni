'use client';

import { useState, useRef, useEffect } from 'react';
import type { Category } from '@canaloni/shared';
import { CATEGORIES } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/hooks/useGuest';

const TUSCANY_BOUNDS = {
  south: 42.3,
  west: 9.7,
  north: 44.5,
  east: 12.4,
};

interface ResolvedPlace {
  lat: number;
  lng: number;
  address: string;
}

interface AddLocationModalProps {
  onClose: () => void;
  onSuccess: (location: any) => void;
  onAuthRequired: () => void;
}

export function AddLocationModal({ onClose, onSuccess, onAuthRequired }: AddLocationModalProps) {
  const { user } = useAuth();
  const { guestName } = useGuest();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('pizzeria');
  const [description, setDescription] = useState('');
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedPlace | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attach Google Places Autocomplete to the search input
  useEffect(() => {
    if (!inputRef.current || typeof window === 'undefined' || !window.google) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      bounds: new window.google.maps.LatLngBounds(
        { lat: TUSCANY_BOUNDS.south, lng: TUSCANY_BOUNDS.west },
        { lat: TUSCANY_BOUNDS.north, lng: TUSCANY_BOUNDS.east }
      ),
      fields: ['name', 'geometry', 'formatted_address'],
      strictBounds: false,
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address ?? place.name ?? '';
      setResolvedPlace({ lat, lng, address });
      // Pre-fill name if still empty
      if (!name && place.name) {
        setName(place.name);
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(ac);
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    setUploading(true);
    const { data, error } = await supabase.storage
      .from('location-photos')
      .upload(fileName, file, { upsert: false });
    setUploading(false);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('location-photos').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !guestName) { onAuthRequired(); return; }
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!resolvedPlace) { setError('Please search and select a place.'); return; }

    setLoading(true);
    setError(null);

    let photo_url: string | null = null;
    if (photoFile) {
      photo_url = await uploadPhoto(photoFile);
    }

    const payload = {
      name: name.trim(),
      category,
      description: description.trim(),
      lat: resolvedPlace.lat,
      lng: resolvedPlace.lng,
      photo_url,
    };

    setLoading(false);
    // Pass payload to parent for optimistic insert; close immediately
    onSuccess(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brown/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-tuscany-lg max-h-[92vh] flex flex-col animate-slide-up">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-brown/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark">
          <h2 className="text-lg font-serif font-bold text-brown">📍 Pin a Location</h2>
          <button onClick={onClose} className="text-brown/40 hover:text-brown text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}

          {/* Place Search */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Search for a place *</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for a place…"
              className="input-field"
              autoComplete="off"
            />
            {resolvedPlace && (
              <p className="text-xs text-brown/50 mt-1">📍 {resolvedPlace.address}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Trattoria da Mario"
              className="input-field"
              required
              maxLength={120}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="input-field"
              required
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe this place…"
              rows={3}
              className="input-field resize-none"
              maxLength={500}
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Photo (optional)</label>
            {photoPreview && (
              <div className="relative h-32 rounded-lg overflow-hidden mb-2 bg-cream-dark">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-brown/20 rounded-lg px-4 py-3 hover:border-terracotta/40 transition-colors">
              <span className="text-xl">📷</span>
              <span className="text-sm text-brown/60">
                {photoFile ? photoFile.name : 'Choose a photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || uploading || !resolvedPlace}
            className="btn-primary w-full py-3 text-base sticky bottom-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploading ? 'Saving…' : '📌 Pin this Location'}
          </button>
        </form>
      </div>
    </div>
  );
}
