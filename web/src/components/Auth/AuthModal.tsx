'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps {
  onClose: () => void;
  defaultMode?: 'sign-in' | 'sign-up';
}

export function AuthModal({ onClose, defaultMode = 'sign-in' }: AuthModalProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-tuscany-lg w-full max-w-sm mx-4 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-terracotta px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold">Canaloni</h2>
              <p className="text-white/80 text-sm mt-0.5">
                {mode === 'sign-in' ? 'Welcome back!' : 'Join the community'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
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
        </form>
      </div>
    </div>
  );
}
