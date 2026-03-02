'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Profile } from '@canaloni/shared';

const AVATAR_EMOJIS = ['🧑‍🌾', '🍷', '🏛️', '🚴', '🧑‍🍳', '⛵', '🌻', '🎨'];

export default function SettingsPage() {
  const router = useRouter();
  const { user, session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🧑‍🌾');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!user && !loadingProfile) {
      router.replace('/');
    }
  }, [user, loadingProfile, router]);

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as unknown as Profile;
          setProfile(p);
          setSelectedAvatar(p.avatar_url ?? AVATAR_EMOJIS[0]);
        }
        setLoadingProfile(false);
      });
  }, [user]);

  const handleSaveAvatar = useCallback(async () => {
    if (!user) return;
    setSavingAvatar(true);
    setSaveError(null);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: selectedAvatar });
    setSavingAvatar(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }, [user, selectedAvatar]);

  const handleDeleteAccount = useCallback(async () => {
    if (!session) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(data.error ?? 'Failed to delete account.');
      return;
    }
    await signOut();
    router.replace('/');
  }, [session, signOut, router]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-cream-dark px-4 h-14 flex items-center gap-3 shadow-tuscany">
        <Link href="/" className="text-brown/60 hover:text-brown transition-colors text-sm">← Back</Link>
        <h1 className="font-serif font-bold text-brown text-lg">Account Settings</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Account Info */}
        <section className="bg-white rounded-2xl shadow-tuscany p-6 space-y-4">
          <h2 className="font-semibold text-brown text-base">Account Info</h2>
          <div>
            <label className="block text-xs font-medium text-brown/50 mb-1 uppercase tracking-wide">Username</label>
            <input
              type="text"
              value={profile?.username ?? '—'}
              disabled
              className="input-field bg-cream cursor-not-allowed text-brown/60"
            />
            <p className="text-xs text-brown/40 mt-1">Username cannot be changed.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-brown/50 mb-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={user.email ?? '—'}
              disabled
              className="input-field bg-cream cursor-not-allowed text-brown/60"
            />
          </div>
        </section>

        {/* Avatar */}
        <section className="bg-white rounded-2xl shadow-tuscany p-6 space-y-4">
          <h2 className="font-semibold text-brown text-base">Avatar</h2>

          {/* Current avatar preview */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-terracotta/10 border-2 border-terracotta/20 flex items-center justify-center text-3xl">
              {selectedAvatar && !selectedAvatar.startsWith('http') ? selectedAvatar : '👤'}
            </div>
            <span className="text-sm text-brown/60">Current avatar</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {AVATAR_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedAvatar(emoji)}
                className={`h-14 rounded-xl text-3xl flex items-center justify-center transition-colors ${
                  selectedAvatar === emoji
                    ? 'bg-terracotta/20 border-2 border-terracotta'
                    : 'bg-cream hover:bg-cream-dark border-2 border-transparent'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-green-600">✓ Avatar saved!</p>
          )}

          <button
            onClick={handleSaveAvatar}
            disabled={savingAvatar}
            className="btn-primary w-full py-2.5"
          >
            {savingAvatar ? 'Saving…' : 'Save changes'}
          </button>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-2xl border-2 border-red-200 p-6 space-y-3">
          <h2 className="font-semibold text-red-700 text-base">Danger Zone</h2>
          <p className="text-sm text-brown/60">
            Permanently delete your account, all your pinned locations, and reviews. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </section>
      </div>

      {/* Delete Account Confirm Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-tuscany-lg w-full max-w-sm mx-4 overflow-hidden animate-slide-up">
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-lg font-serif font-bold text-brown mb-1">Delete Account?</h3>
              <p className="text-sm text-brown/70 mb-3">
                This will delete all your locations, reviews, and account data. This cannot be undone.
              </p>
              <label className="block text-sm font-medium text-brown mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                className="input-field"
                autoFocus
              />
              {deleteError && (
                <p className="text-sm text-red-600 mt-2">{deleteError}</p>
              )}
            </div>
            <div className="px-6 pb-6 pt-4 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); setDeleteError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-brown/20 text-brown text-sm font-medium hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
