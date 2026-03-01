'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLocation } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/Auth/AuthModal';
import { CategoryBadge } from '@/components/UI/CategoryBadge';
import { StarRating } from '@/components/UI/StarRating';
import { ReviewForm } from '@/components/Location/ReviewForm';
import { LocationDetail } from '@/components/Location/LocationDetail';

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { location, loading, error } = useLocation(id);
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-4">🗺️</p>
          <h1 className="font-serif text-xl text-brown mb-2">Location not found</h1>
          <Link href="/" className="btn-primary inline-block mt-4">Back to Map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-cream-dark shadow-tuscany">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-terracotta hover:underline text-sm font-medium">← Map</Link>
          <h1 className="font-serif font-bold text-brown text-lg truncate">{location.name}</h1>
        </div>
      </header>

      {/* Use the same LocationDetail component but full-page */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LocationDetail
          location={location}
          onClose={() => router.push('/')}
          onAuthRequired={() => setShowAuth(true)}
        />
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
