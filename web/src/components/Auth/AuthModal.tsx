'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  defaultMode?: 'sign-in' | 'sign-up';
  onContinueAsGuest?: (name: string) => void;
}

const AVATAR_EMOJIS = ['🧑‍🌾', '🍷', '🏛️', '🚴', '🧑‍🍳', '⛵', '🌻', '🎨'];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function AuthModal({ onClose, defaultMode = 'sign-in', onContinueAsGuest }: AuthModalProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'guest' | 'setup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestNameInput, setGuestNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  // Setup step state
  const [setupUserId, setSetupUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_EMOJIS[0]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Debounced username uniqueness check
  useEffect(() => {
    if (!username || !USERNAME_REGEX.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      setUsernameAvailable(data === null);
      setUsernameChecking(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'guest') {
      const trimmed = guestNameInput.trim();
      if (!trimmed) { setError('Please enter a display name.'); return; }
      if (trimmed.length < 2) { setError('Name must be at least 2 characters.'); return; }
      onContinueAsGuest?.(trimmed);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else if (mode === 'sign-up') {
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        // Email confirm disabled → session is live immediately
        if (data?.session && data?.user) {
          setSetupUserId(data.user.id);
          setMode('setup');
        } else {
          setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUserId) return;
    if (!USERNAME_REGEX.test(username)) {
      setError('Username must be 3-20 characters: letters, numbers, underscores.');
      return;
    }
    if (usernameAvailable === false) {
      setError('That username is already taken.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: setupUserId, username, avatar_url: selectedAvatar });
    setSavingProfile(false);

    if (error) {
      setError(error.message);
    } else {
      onClose();
    }
  }, [setupUserId, username, usernameAvailable, selectedAvatar, onClose]);

  const headerSubtitle =
    mode === 'guest' ? 'Continue without an account' :
    mode === 'setup' ? 'Set up your profile' :
    mode === 'sign-in' ? 'Welcome back!' : 'Join the community';

  const usernameStatus = () => {
    if (!username) return null;
    if (!USERNAME_REGEX.test(username)) return <span className="text-red-500">3-20 chars, letters/numbers/_</span>;
    if (usernameChecking) return <span className="text-brown/40">Checking…</span>;
    if (usernameAvailable === true) return <span className="text-green-600">✓ Available</span>;
    if (usernameAvailable === false) return <span className="text-red-500">✗ Already taken</span>;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-tuscany-lg w-full max-w-sm mx-4 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-terracotta px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold">Canaloni</h2>
              <p className="text-white/80 text-sm mt-0.5">{headerSubtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Setup step */}
        {mode === 'setup' ? (
          <form onSubmit={handleSetupSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-brown mb-1">Username *</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. marco_firenze"
                className="input-field"
                required
                maxLength={20}
                autoFocus
              />
              <div className="text-xs mt-1">{usernameStatus()}</div>
              <p className="text-xs text-brown/40 mt-1">Username is permanent and cannot be changed later.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown mb-2">Pick an avatar</label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`h-12 rounded-xl text-2xl flex items-center justify-center transition-colors ${
                      selectedAvatar === emoji
                        ? 'bg-terracotta/20 border-2 border-terracotta'
                        : 'bg-cream hover:bg-cream-dark border-2 border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile || usernameChecking || usernameAvailable === false || !username}
              className="btn-primary w-full py-3 text-base"
            >
              {savingProfile ? 'Saving…' : 'Done →'}
            </button>
          </form>
        ) : (
          /* Auth form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">
                {successMsg}
              </div>
            )}

            {mode === 'guest' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-brown mb-1">Display name</label>
                  <input
                    type="text"
                    value={guestNameInput}
                    onChange={e => setGuestNameInput(e.target.value)}
                    placeholder="e.g. Marco from Florence"
                    className="input-field"
                    required
                    minLength={2}
                    maxLength={60}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-3 text-base">
                  Continue →
                </button>
                <p className="text-center text-sm text-brown/60">
                  <button
                    type="button"
                    onClick={() => { setMode('sign-in'); setError(null); }}
                    className="text-terracotta font-medium hover:underline"
                  >
                    ← Back to sign in
                  </button>
                </p>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-brown mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                    required
                    minLength={6}
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-brown/60">
                  {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); setSuccessMsg(null); }}
                    className="text-terracotta font-medium hover:underline"
                  >
                    {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>

                {onContinueAsGuest && (
                  <p className="text-center text-sm text-brown/40">
                    <button
                      type="button"
                      onClick={() => { setMode('guest'); setError(null); setSuccessMsg(null); }}
                      className="hover:text-brown/60 transition-colors"
                    >
                      Continue as Guest
                    </button>
                  </p>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
