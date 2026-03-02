'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Location, Review, Category } from '@canaloni/shared';
import { CATEGORIES, formatDate, formatRating } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCheckIn } from '@/hooks/useCheckIn';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { ReviewForm } from './ReviewForm';
import { DeleteConfirmModal } from '@/components/Map/DeleteConfirmModal';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

const CATEGORY_GRADIENTS: Record<Category, string> = {
  pizzeria:          'linear-gradient(135deg, #E05A2A 0%, #A04E20 100%)',
  classic_italian:   'linear-gradient(135deg, #C4622D 0%, #8B3A1C 100%)',
  beef_meat:         'linear-gradient(135deg, #8B4513 0%, #5C2E0A 100%)',
  seafood:           'linear-gradient(135deg, #2980B9 0%, #1A5276 100%)',
  vineyards:         'linear-gradient(135deg, #7D3C98 0%, #4A235A 100%)',
  hotels:            'linear-gradient(135deg, #B7950B 0%, #9A7D0A 100%)',
  sightseeing:       'linear-gradient(135deg, #616A6B 0%, #4D5656 100%)',
  views_panoramas:   'linear-gradient(135deg, #E67E22 0%, #A04000 100%)',
  beaches:           'linear-gradient(135deg, #21A1DC 0%, #1A76A8 100%)',
  walking_trails:    'linear-gradient(135deg, #6B7C3A 0%, #4A5628 100%)',
  mountains:         'linear-gradient(135deg, #5D6D7E 0%, #2E4053 100%)',
  home_residential:  'linear-gradient(135deg, #C4622D 0%, #8E4A2B 100%)',
  museums_galleries: 'linear-gradient(135deg, #884EA0 0%, #5B2C6F 100%)',
  local_markets:     'linear-gradient(135deg, #D35400 0%, #922B21 100%)',
  pharmacy:          'linear-gradient(135deg, #1ABC9C 0%, #148F77 100%)',
  taxi_station:      'linear-gradient(135deg, #D4AC0D 0%, #B7950B 100%)',
  train_station:     'linear-gradient(135deg, #7F8C8D 0%, #4D5656 100%)',
};

interface LocationDetailProps {
  location: Location;
  onClose: () => void;
  onAuthRequired: () => void;
  onLocationDeleted?: (id: string) => void;
  onRefetch?: () => void;
  guestName?: string | null;
  username?: string | null;
}

export function LocationDetail({
  location,
  onClose,
  onAuthRequired,
  onLocationDeleted,
  onRefetch,
  guestName,
  username,
}: LocationDetailProps) {
  const { user, session } = useAuth();
  const { hasCheckedIn, count: checkInCount, loading: checkInLoading, toggle: toggleCheckIn, canCheckIn } = useCheckIn(location.id, guestName);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [localReviewCount, setLocalReviewCount] = useState(location.review_count ?? 0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = !!(user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isOwner = !!(user && location.created_by && user.id === location.created_by);
  const canDelete = isOwner || isAdmin;

  const categoryEmoji = CATEGORIES.find(c => c.value === location.category)?.emoji ?? '📍';
  const categoryGradient = CATEGORY_GRADIENTS[location.category] ?? CATEGORY_GRADIENTS.classic_italian;

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);

    // Step 1: fetch reviews without a join (PostgREST can't auto-join reviews→profiles)
    const { data: reviewData, error } = await (supabase as any)
      .from('reviews')
      .select('*')
      .eq('location_id', location.id)
      .order('created_at', { ascending: false });

    if (error || !reviewData) {
      setLoadingReviews(false);
      return;
    }

    // Step 2: fetch profiles for any user_ids present
    const userIds: string[] = reviewData
      .filter((r: any) => r.user_id)
      .map((r: any) => r.user_id);

    let profileMap: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      if (profileData) {
        profileMap = Object.fromEntries(profileData.map((p: any) => [p.id, p]));
      }
    }

    setReviews(
      reviewData.map((r: any) => ({
        ...r,
        username: r.user_id
          ? (profileMap[r.user_id]?.username ?? 'User')
          : (r.guest_name ?? 'Guest'),
        avatar_url: r.user_id ? (profileMap[r.user_id]?.avatar_url ?? null) : null,
      }))
    );
    setLoadingReviews(false);
  }, [location.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReviewSuccess = useCallback((newReview: Review) => {
    setReviews(prev => [newReview, ...prev]);
    setLocalReviewCount(c => c + 1);
    setShowReviewForm(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!session) return;
    setDeleting(true);
    setDeleteError(null);

    onLocationDeleted?.(location.id);
    onClose();

    const res = await fetch(`/api/locations/${location.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      onRefetch?.();
      setDeleteError(body.error ?? 'Failed to delete location.');
    }
  }, [session, location.id, onLocationDeleted, onClose, onRefetch]);

  const avgRating = location.avg_rating ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-brown/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel: bottom sheet on mobile, right side panel on desktop */}
        <div className="absolute bottom-0 left-0 right-0 sm:left-auto sm:top-0 sm:right-0 sm:w-[420px] bg-white rounded-t-3xl sm:rounded-none flex flex-col max-h-[92vh] sm:max-h-full sm:h-full shadow-tuscany-lg animate-slide-up sm:animate-slide-right">

          {/* Mobile drag handle */}
          <div className="flex justify-center pt-2.5 pb-0 sm:hidden shrink-0">
            <div className="w-10 h-1 bg-brown/20 rounded-full" />
          </div>

          {/* Photo / gradient banner */}
          <div className="relative shrink-0 h-52 sm:h-60 overflow-hidden rounded-t-3xl sm:rounded-none">
            {location.photo_url ? (
              <Image
                src={location.photo_url}
                alt={location.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 420px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: categoryGradient }}
              >
                <span style={{ fontSize: '80px', lineHeight: 1, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.22))' }}>
                  {categoryEmoji}
                </span>
              </div>
            )}

            {/* Gradient scrim at bottom for readability */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

            {/* Top-right controls overlaid on image */}
            <div className="absolute top-3 right-3 flex gap-2">
              {canDelete && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting}
                  className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow text-red-400 hover:text-red-600 text-sm transition-colors"
                  title="Delete this location"
                >
                  🗑️
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow text-brown/60 hover:text-brown text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 pb-8">

            {/* Name + category */}
            <div className="pt-4 pb-3 border-b border-cream-dark">
              <CategoryBadge category={location.category} size="sm" />
              <h2 className="text-[22px] font-serif font-bold text-brown mt-1.5 leading-tight">
                {location.name}
              </h2>

              {/* Stats row */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {avgRating !== null ? (
                  <>
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-sm font-semibold text-amber-600">{formatRating(avgRating)}</span>
                  </>
                ) : (
                  <span className="text-xs text-brown/40 italic">No ratings yet</span>
                )}
                <span className="text-xs text-brown/30">·</span>
                <span className="text-xs text-brown/60">💬 {localReviewCount} review{localReviewCount !== 1 ? 's' : ''}</span>
                {checkInCount > 0 && (
                  <>
                    <span className="text-xs text-brown/30">·</span>
                    <span className="text-xs text-brown/60">👁 {checkInCount} visited</span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {location.description && (
              <p className="text-brown/70 text-sm leading-relaxed py-3 border-b border-cream-dark">
                {location.description}
              </p>
            )}

            {deleteError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</div>
            )}

            {/* Action buttons */}
            <div className={`py-4 grid gap-3 border-b border-cream-dark ${isOwner ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {/* Been Here */}
              <button
                onClick={canCheckIn ? toggleCheckIn : onAuthRequired}
                disabled={checkInLoading}
                className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                  hasCheckedIn
                    ? 'bg-olive text-white shadow-sm'
                    : 'border-2 border-olive/50 text-olive hover:bg-olive/10'
                }`}
              >
                {checkInLoading ? '…' : hasCheckedIn ? '✓ Been Here!' : '✓ Been Here?'}
              </button>

              {/* Write a Review — not for owners */}
              {!isOwner && (
                <button
                  onClick={() => {
                    if (!user && !guestName) { onAuthRequired(); return; }
                    setShowReviewForm(prev => !prev);
                  }}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                    showReviewForm
                      ? 'bg-brown/10 text-brown border-2 border-brown/20'
                      : 'bg-terracotta text-white shadow-sm hover:bg-terracotta-dark'
                  }`}
                >
                  {showReviewForm ? '✕ Cancel' : '★ Write a Review'}
                </button>
              )}
            </div>

            {/* Owner banner */}
            {isOwner && (
              <div className="py-3 border-b border-cream-dark">
                <div className="bg-cream rounded-xl p-3 text-center text-xs text-brown/60">
                  📌 You pinned this — others can leave reviews
                </div>
              </div>
            )}

            {/* Review form */}
            {showReviewForm && !isOwner && (
              <div className="py-4 border-b border-cream-dark">
                <ReviewForm
                  locationId={location.id}
                  onSuccess={handleReviewSuccess}
                  onAuthRequired={onAuthRequired}
                  guestName={guestName}
                  username={username}
                />
              </div>
            )}

            {/* Reviews list */}
            <div className="pt-4">
              <h4 className="font-semibold text-brown text-sm mb-3">
                Reviews {localReviewCount > 0 && <span className="text-brown/40 font-normal">({localReviewCount})</span>}
              </h4>

              {loadingReviews ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-cream-dark shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-cream-dark rounded w-1/3" />
                        <div className="h-3 bg-cream-dark rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-brown/50 text-sm italic text-center py-6">
                  No reviews yet — be the first! ✨
                </p>
              ) : (
                <div className="divide-y divide-cream-dark">
                  {reviews.map(review => (
                    <div key={review.id} className="flex gap-3 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-terracotta/15 flex items-center justify-center shrink-0 text-terracotta font-bold text-sm">
                        {(review.username ?? 'G').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-brown leading-tight">{review.username ?? 'Guest'}</span>
                          <span className="text-xs text-brown/40 shrink-0">{formatDate(review.created_at)}</span>
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
