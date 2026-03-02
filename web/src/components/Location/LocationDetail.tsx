'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Location, Review } from '@canaloni/shared';
import { formatDate, formatRating } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { ReviewForm } from './ReviewForm';
import { DeleteConfirmModal } from '@/components/Map/DeleteConfirmModal';

interface LocationDetailProps {
  location: Location;
  onClose: () => void;
  onAuthRequired: () => void;
  onLocationDeleted?: (id: string) => void;
  onRefetch?: () => void;
}

export function LocationDetail({ location, onClose, onAuthRequired, onLocationDeleted, onRefetch }: LocationDetailProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isOwner = !!(user && location.created_by && user.id === location.created_by);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(username, avatar_url)')
      .eq('location_id', location.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(
        data.map((r: any) => ({
          ...r,
          username: r.profiles?.username ?? 'Anonymous',
          avatar_url: r.profiles?.avatar_url,
        }))
      );
    }
    setLoadingReviews(false);
  }, [location.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteError(null);
    // Optimistic: remove from parent state immediately
    onLocationDeleted?.(location.id);
    onClose();

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', location.id);

    if (error) {
      // Restore state on failure
      onRefetch?.();
      setDeleteError(error.message);
    }
  }, [location.id, onLocationDeleted, onClose, onRefetch]);

  const avgRating = location.avg_rating ?? null;
  const reviewCount = location.review_count ?? reviews.length;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-brown/40 backdrop-blur-sm animate-fade-in">
        <div
          className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-tuscany-lg max-h-[90vh] flex flex-col animate-slide-up"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 bg-brown/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3 relative">
            <div className="flex-1 min-w-0 pr-3">
              <CategoryBadge category={location.category} size="sm" />
              <h2 className="text-xl font-serif font-bold text-brown mt-2 leading-tight">{location.name}</h2>

              <div className="flex items-center gap-2 mt-1.5">
                {avgRating !== null ? (
                  <>
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-sm font-semibold text-amber-600">{formatRating(avgRating)}</span>
                    <span className="text-sm text-brown/50">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                  </>
                ) : (
                  <span className="text-sm text-brown/50">No ratings yet</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Delete button for owner */}
              {isOwner && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete this location"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={onClose}
                className="text-brown/40 hover:text-brown text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{deleteError}</div>
            )}

            {/* Photo */}
            {location.photo_url && (
              <div className="relative h-48 rounded-xl overflow-hidden bg-cream-dark">
                <Image
                  src={location.photo_url}
                  alt={location.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              </div>
            )}

            {/* Description */}
            {location.description && (
              <p className="text-brown/70 text-sm leading-relaxed">{location.description}</p>
            )}

            {/* Coordinates */}
            <div className="flex gap-2 text-xs text-brown/40 font-mono">
              <span>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-cream-dark" />

            {/* Review form or owner banner */}
            {isOwner ? (
              <div className="bg-cream rounded-xl p-4 text-center text-sm text-brown/60">
                📌 You pinned this location — others can leave reviews
              </div>
            ) : (
              <ReviewForm
                locationId={location.id}
                onSuccess={fetchReviews}
                onAuthRequired={onAuthRequired}
              />
            )}

            {/* Divider */}
            <div className="border-t border-cream-dark" />

            {/* Reviews list */}
            <div>
              <h4 className="font-semibold text-brown mb-3">
                Reviews {reviewCount > 0 && <span className="text-brown/40 font-normal text-sm">({reviewCount})</span>}
              </h4>

              {loadingReviews ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-3 bg-cream-dark rounded w-1/4" />
                      <div className="h-3 bg-cream-dark rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-brown/50 text-sm italic">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-terracotta/20 flex items-center justify-center shrink-0 text-terracotta font-semibold text-sm">
                        {(review.username ?? 'A').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-brown">{review.username ?? 'Anonymous'}</span>
                          <span className="text-xs text-brown/40">{formatDate(review.created_at)}</span>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                        {review.comment && (
                          <p className="text-sm text-brown/70 mt-1 leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          locationName={location.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
