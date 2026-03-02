'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Location, Review } from '@canaloni/shared';
import { CATEGORIES, formatDate, formatRating } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCheckIn } from '@/hooks/useCheckIn';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { ReviewForm } from './ReviewForm';
import { DeleteConfirmModal } from '@/components/Map/DeleteConfirmModal';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

interface LocationDetailProps {
  location: Location;
  onClose: () => void;
  onAuthRequired: () => void;
  onLocationDeleted?: (id: string) => void;
  onRefetch?: () => void;
  guestName?: string | null;
}

export function LocationDetail({
  location,
  onClose,
  onAuthRequired,
  onLocationDeleted,
  onRefetch,
  guestName,
}: LocationDetailProps) {
  const { user, session } = useAuth();
  const { hasCheckedIn, count: checkInCount, loading: checkInLoading, toggle: toggleCheckIn, canCheckIn } = useCheckIn(location.id, guestName);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = !!(user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isOwner = !!(user && location.created_by && user.id === location.created_by);
  const canDelete = isOwner || isAdmin;

  const categoryEmoji = CATEGORIES.find(c => c.value === location.category)?.emoji ?? '📍';

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
          username: r.profiles?.username ?? r.guest_name ?? 'Guest',
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
    if (!session) return;
    setDeleting(true);
    setDeleteError(null);

    // Optimistic: close and remove from map immediately
    onLocationDeleted?.(location.id);
    onClose();

    const res = await fetch(`/api/locations/${location.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      onRefetch?.(); // restore map state
      setDeleteError(body.error ?? 'Failed to delete location.');
    }
  }, [session, location.id, onLocationDeleted, onClose, onRefetch]);

  const avgRating = location.avg_rating ?? null;
  const reviewCount = location.review_count ?? reviews.length;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-brown/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-tuscany-lg max-h-[92vh] flex flex-col animate-slide-up">
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 bg-brown/20 rounded-full" />
          </div>

          {/* Hero Header */}
          <div className="px-5 pt-4 pb-3">
            {/* Top controls row */}
            <div className="flex items-center justify-end gap-1 mb-3">
              {canDelete && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-base"
                  title="Delete this location"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center text-brown/40 hover:text-brown hover:bg-cream rounded-xl text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Category emoji + name */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-cream flex items-center justify-center text-2xl shrink-0">
                {categoryEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <CategoryBadge category={location.category} size="sm" />
                <h2 className="text-xl font-serif font-bold text-brown mt-1 leading-tight">
                  {location.name}
                </h2>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 flex-wrap mt-1">
              {avgRating !== null ? (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={avgRating} size="sm" />
                  <span className="text-sm font-semibold text-amber-600">{formatRating(avgRating)}</span>
                </div>
              ) : (
                <span className="text-sm text-brown/40">No ratings yet</span>
              )}
              <span className="text-xs text-brown/30">·</span>
              <span className="text-xs text-brown/60">💬 {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              {checkInCount > 0 && (
                <>
                  <span className="text-xs text-brown/30">·</span>
                  <span className="text-xs text-brown/60">👁 {checkInCount} visited</span>
                </>
              )}
            </div>

            {deleteError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            {/* Photo */}
            {location.photo_url && (
              <div className="relative h-44 rounded-xl overflow-hidden bg-cream-dark">
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

            {/* Been Here button */}
            <button
              onClick={canCheckIn ? toggleCheckIn : onAuthRequired}
              disabled={checkInLoading}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                hasCheckedIn
                  ? 'bg-olive/10 border-olive text-olive'
                  : 'bg-white border-brown/20 text-brown/70 hover:border-brown/40 hover:bg-cream'
              }`}
            >
              {checkInLoading ? '…' : hasCheckedIn ? "✓ You've been here!" : 'Been Here? ✓'}
            </button>

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
                guestName={guestName}
              />
            )}

            <div className="border-t border-cream-dark" />

            {/* Reviews list */}
            <div>
              <h4 className="font-semibold text-brown mb-3 text-sm">
                Reviews {reviewCount > 0 && <span className="text-brown/40 font-normal">({reviewCount})</span>}
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
                        {(review.username ?? 'G').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-brown">{review.username ?? 'Guest'}</span>
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
