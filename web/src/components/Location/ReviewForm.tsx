'use client';

import { useState } from 'react';
import type { Review } from '@canaloni/shared';
import { StarRating } from '@/components/UI/StarRating';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ReviewFormProps {
  locationId: string;
  onSuccess: (review: Review) => void;
  onAuthRequired: () => void;
  guestName?: string | null;
  username?: string | null;
}

type Mode = 'choose' | 'guest-name' | 'form';

export function ReviewForm({ locationId, onSuccess, onAuthRequired, guestName, username }: ReviewFormProps) {
  const { user } = useAuth();

  const initialMode: Mode = user ? 'form' : guestName ? 'form' : 'choose';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [localGuestName, setLocalGuestName] = useState(guestName ?? '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveName = user ? null : (guestName || localGuestName || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }

    setLoading(true);
    setError(null);

    let reviewData: any = null;
    let submitError: any = null;

    if (user) {
      // Check if user already reviewed this location
      const { data: existing } = await (supabase as any)
        .from('reviews')
        .select('id')
        .eq('location_id', locationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing review
        const { data, error: err } = await (supabase as any)
          .from('reviews')
          .update({ rating, comment: comment.trim() || null })
          .eq('id', existing.id)
          .select('*')
          .single();
        reviewData = data;
        submitError = err;
      } else {
        // Insert new review
        const { data, error: err } = await (supabase as any)
          .from('reviews')
          .insert({ location_id: locationId, user_id: user.id, rating, comment: comment.trim() || null })
          .select('*')
          .single();
        reviewData = data;
        submitError = err;
      }
    } else {
      // Guest insert
      const { data, error: err } = await (supabase as any)
        .from('reviews')
        .insert({ location_id: locationId, user_id: null, guest_name: effectiveName, rating, comment: comment.trim() || null })
        .select('*')
        .single();
      reviewData = data;
      submitError = err;
    }

    setLoading(false);

    if (submitError || !reviewData) {
      setError(submitError?.message ?? 'Failed to post review. Please try again.');
    } else {
      setRating(0);
      setComment('');
      const reviewWithUsername: Review = {
        ...reviewData,
        username: user
          ? (username ?? user.email?.split('@')[0] ?? 'User')
          : (effectiveName ?? 'Guest'),
        avatar_url: null,
      };
      onSuccess(reviewWithUsername);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="bg-cream rounded-xl p-4 space-y-3">
        <p className="text-brown/80 text-sm font-semibold text-center">Leave a Review</p>
        <div className="flex flex-col gap-2">
          <button onClick={onAuthRequired} className="btn-primary text-sm py-2.5">
            Sign in to review
          </button>
          <button onClick={() => setMode('guest-name')} className="btn-secondary text-sm py-2.5">
            Continue as guest
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'guest-name') {
    return (
      <div className="bg-cream rounded-xl p-4 space-y-3">
        <p className="text-brown/80 text-sm font-medium">Your name for the review</p>
        <input
          type="text"
          value={localGuestName}
          onChange={e => setLocalGuestName(e.target.value)}
          placeholder="e.g. Marco from Florence"
          className="input-field"
          maxLength={60}
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => setMode('choose')} className="btn-secondary flex-1 text-sm py-2">
            Back
          </button>
          <button
            onClick={() => { if (localGuestName.trim()) setMode('form'); }}
            disabled={!localGuestName.trim()}
            className="btn-primary flex-1 text-sm py-2"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-brown text-sm">Your Review</h4>
        {!user && effectiveName && (
          <span className="text-xs text-brown/50 bg-cream px-2 py-0.5 rounded-full">
            as {effectiveName}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs text-brown/60 mb-1.5">Rating *</label>
        <StarRating rating={rating} interactive onRate={setRating} size="lg" />
      </div>

      <div>
        <label className="block text-xs text-brown/60 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          className="input-field resize-none text-sm"
          maxLength={500}
        />
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="btn-primary w-full py-2.5"
      >
        {loading ? 'Posting…' : 'Post Review'}
      </button>
    </form>
  );
}
