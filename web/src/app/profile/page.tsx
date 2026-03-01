'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Location, Review } from '@canaloni/shared';
import { formatDate } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);
      const [locRes, revRes] = await Promise.all([
        supabase
          .from('locations')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, locations(name, category)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setLocations((locRes.data as Location[]) ?? []);
      setReviews((revRes.data as any[]) ?? []);
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-cream-dark shadow-tuscany">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-terracotta hover:underline text-sm font-medium">← Map</Link>
          <h1 className="font-serif font-bold text-brown text-lg">My Profile</h1>
          <button onClick={signOut} className="text-sm text-brown/50 hover:text-terracotta transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* User info */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta font-bold text-2xl font-serif">
            {user.email?.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-brown">{user.email?.split('@')[0]}</p>
            <p className="text-sm text-brown/50">{user.email}</p>
            <div className="flex gap-3 mt-1 text-sm text-brown/40">
              <span>{locations.length} pins</span>
              <span>{reviews.length} reviews</span>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Pinned Locations */}
            <section>
              <h2 className="font-serif font-bold text-brown text-lg mb-3">
                📍 My Pinned Locations
              </h2>
              {locations.length === 0 ? (
                <div className="card p-6 text-center text-brown/50">
                  <p className="text-3xl mb-2">🗺️</p>
                  <p>You haven't pinned any locations yet.</p>
                  <Link href="/" className="btn-primary mt-3 inline-block text-sm px-5 py-2">
                    Start exploring
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map(loc => (
                    <div key={loc.id} className="card p-4 flex items-start gap-3">
                      {loc.photo_url && (
                        <img
                          src={loc.photo_url}
                          alt={loc.name}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CategoryBadge category={loc.category} size="sm" />
                            <h3 className="font-semibold text-brown mt-1 leading-tight">{loc.name}</h3>
                          </div>
                        </div>
                        {loc.description && (
                          <p className="text-sm text-brown/60 mt-1 line-clamp-2">{loc.description}</p>
                        )}
                        <p className="text-xs text-brown/40 mt-1">{formatDate(loc.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section>
              <h2 className="font-serif font-bold text-brown text-lg mb-3">
                ⭐ My Reviews
              </h2>
              {reviews.length === 0 ? (
                <div className="card p-6 text-center text-brown/50">
                  <p className="text-3xl mb-2">✍️</p>
                  <p>You haven't written any reviews yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev: any) => (
                    <div key={rev.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          {rev.locations && (
                            <CategoryBadge category={rev.locations.category} size="sm" />
                          )}
                          <h3 className="font-semibold text-brown mt-1 text-sm">
                            {rev.locations?.name ?? 'Unknown location'}
                          </h3>
                        </div>
                        <span className="text-xs text-brown/40 shrink-0">{formatDate(rev.created_at)}</span>
                      </div>
                      <StarRating rating={rev.rating} size="sm" />
                      {rev.comment && (
                        <p className="text-sm text-brown/70 mt-1">{rev.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
