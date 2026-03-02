'use client';

import { useState } from 'react';
import type { Category, Location } from '@canaloni/shared';
import { CATEGORIES } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface EditLocationModalProps {
  location: Location;
  onClose: () => void;
  onSuccess: (updated: Location) => void;
}

export function EditLocationModal({ location, onClose, onSuccess }: EditLocationModalProps) {
  const { session } = useAuth();

  const [name, setName] = useState(location.name);
  const [category, setCategory] = useState<Category>(location.category);
  const [description, setDescription] = useState(location.description ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { data, error: uploadError } = await supabase.storage
      .from('location-photos')
      .upload(fileName, file, { upsert: false });
    setUploading(false);
    if (uploadError) return null;
    const { data: urlData } = supabase.storage.from('location-photos').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!session) { setError('You must be signed in to edit.'); return; }

    setLoading(true);
    setError(null);

    let photo_url = location.photo_url;
    if (photoFile) {
      const uploaded = await uploadPhoto(photoFile);
      if (uploaded) photo_url = uploaded;
    }

    const res = await fetch(`/api/locations/${location.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        category,
        description: description.trim(),
        photo_url,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to save changes.');
      return;
    }

    const updated = await res.json();
    onSuccess(updated);
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
          <h2 className="text-lg font-serif font-bold text-brown">✏️ Edit Location</h2>
          <button
            onClick={onClose}
            className="text-brown/40 hover:text-brown text-2xl leading-none w-9 h-9 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              required
              maxLength={120}
              autoFocus
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
              rows={3}
              className="input-field resize-none"
              maxLength={500}
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Photo</label>
            {(photoPreview ?? location.photo_url) && (
              <div className="relative h-32 rounded-lg overflow-hidden mb-2 bg-cream-dark">
                <img
                  src={photoPreview ?? location.photo_url!}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {photoPreview && (
                  <span className="absolute top-2 left-2 bg-terracotta text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    New
                  </span>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-brown/20 rounded-lg px-4 py-3 hover:border-terracotta/40 transition-colors">
              <span className="text-xl">📷</span>
              <span className="text-sm text-brown/60">
                {photoFile ? photoFile.name : location.photo_url ? 'Replace photo' : 'Add a photo'}
              </span>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="btn-primary w-full py-3 text-base sticky bottom-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploading ? 'Saving…' : 'Save Changes ✓'}
          </button>
        </form>
      </div>
    </div>
  );
}
