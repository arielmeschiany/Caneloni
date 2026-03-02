'use client';

import { useState, useCallback } from 'react';
import type { Category, NewLocation } from '@canaloni/shared';
import { CATEGORIES, TUSCANY_CENTER } from '@canaloni/shared';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useGuest } from '@/hooks/useGuest';

interface AddLocationModalProps {
  initialLat?: number;
  initialLng?: number;
  initialName?: string;
  onClose: () => void;
  onSuccess: (location: any) => void;
  onAuthRequired: () => void;
}

export function AddLocationModal({
  initialLat,
  initialLng,
  initialName,
  onClose,
  onSuccess,
  onAuthRequired,
}: AddLocationModalProps) {
  const { user } = useAuth();
  const { guestName } = useGuest();
  const { lat: geoLat, lng: geoLng, loading: geoLoading, error: geoError, getCurrentPosition } = useGeolocation();

  const [name, setName] = useState(initialName ?? '');
  const [category, setCategory] = useState<Category>('pizzeria');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<string>(initialLat?.toFixed(6) ?? '');
  const [lng, setLng] = useState<string>(initialLng?.toFixed(6) ?? '');
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When geolocation resolves, populate fields
  const handleUseMyLocation = useCallback(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Sync geolocation coords → form fields once they arrive
  const syncedLat = geoLat !== null ? geoLat.toFixed(6) : lat;
  const syncedLng = geoLng !== null ? geoLng.toFixed(6) : lng;

  const effectiveLat = geoLat ?? (lat ? parseFloat(lat) : undefined);
  const effectiveLng = geoLng ?? (lng ? parseFloat(lng) : undefined);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
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
    if (effectiveLat === undefined || effectiveLng === undefined) {
      setError('Please set coordinates using the map or "Use my location".');
      return;
    }

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
      lat: effectiveLat,
      lng: effectiveLng,
      photo_url,
      created_by: user?.id ?? null,
      guest_name: !user && guestName ? `${guestName} (Guest)` : null,
    };

    const { data, error: insertError } = await supabase
      .from('locations')
      .insert(payload)
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      onSuccess(data);
      onClose();
    }
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

          {/* Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-brown">Coordinates *</label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="text-xs text-terracotta hover:underline disabled:opacity-50"
              >
                {geoLoading ? '📡 Locating…' : '📍 Use my location'}
              </button>
            </div>
            {geoError && <p className="text-xs text-red-500 mb-1">{geoError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-brown/50 mb-0.5 block">Latitude</label>
                <input
                  type="number"
                  value={geoLat !== null ? geoLat.toFixed(6) : lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="43.7711"
                  step="0.000001"
                  className="input-field text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-brown/50 mb-0.5 block">Longitude</label>
                <input
                  type="number"
                  value={geoLng !== null ? geoLng.toFixed(6) : lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="11.2486"
                  step="0.000001"
                  className="input-field text-sm font-mono"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-brown/40 mt-1">
              Tip: Click on the map first to pre-fill these coordinates.
            </p>
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
            disabled={loading || uploading}
            className="btn-primary w-full py-3 text-base sticky bottom-0"
          >
            {loading || uploading ? 'Saving…' : '📌 Pin this Location'}
          </button>
        </form>
      </div>
    </div>
  );
}
