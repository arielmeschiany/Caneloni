'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal } from '@/components/Auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <AuthModal onClose={() => router.push('/')} />
    </div>
  );
}
