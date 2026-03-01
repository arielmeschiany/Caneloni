'use client';

import { useState } from 'react';
import { StarRating } from '@/components/UI/StarRating';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ReviewFormProps {
  locationId: string;
  onSuccess: () => void;
  onAuthRequired: () => void;
}

export function ReviewForm({ locationId, onSuccess, onAuthRequired }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onAuthRequired();
      return;
    }

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.from('reviews').upsert({
      location_id: locationId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setRating(0);
      setComment('');
      onSuccess();
    }
  };

  if (!user) {
    return (
      <div className="bg-cream rounded-xl p-4 text-center">
        <p className="text-brown/70 text-sm mb-3">Sign in to leave a review</p>
        <button onClick={onAuthRequired} className="btn-primary text-sm px-6 py-2">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="font-semibold text-brown">Leave a Review</h4>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-brown/60 mb-1">Rating</label>
        <StarRating
          rating={rating}
          interactive
          onRate={setRating}
          size="lg"
        />
      </div>

      <div>
        <label className="block text-sm text-brown/60 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          className="input-field resize-none"
          maxLength={500}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Posting…' : 'Post Review'}
      </button>
    </form>
  );
}
