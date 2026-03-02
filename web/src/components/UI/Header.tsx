'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@canaloni/shared';

interface HeaderProps {
  user: User | null;
  profile: Profile | null;
  guestName: string | null;
  loading?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

function AvatarCircle({ profile, email }: { profile: Profile | null; email?: string }) {
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = (profile?.username ?? email ?? '?').slice(0, 1).toUpperCase();
  const isEmoji = avatarUrl && !avatarUrl.startsWith('http');

  return (
    <div className="w-8 h-8 rounded-full bg-terracotta/20 border border-terracotta/30 flex items-center justify-center overflow-hidden shrink-0">
      {avatarUrl && !isEmoji ? (
        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
      ) : isEmoji ? (
        <span className="text-base leading-none">{avatarUrl}</span>
      ) : (
        <span className="text-terracotta font-semibold text-sm">{initials}</span>
      )}
    </div>
  );
}

export function Header({ user, profile, guestName, loading, onSignIn, onSignOut }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 h-16 bg-cream border-b border-cream-dark shadow-tuscany flex items-center px-4 gap-3">
      {/* Left: Logo */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-terracotta text-2xl leading-none">📍</span>
        <span className="font-serif font-bold text-terracotta text-xl leading-none">Canaloni</span>
      </div>

      {/* Center: Search portal slot */}
      <div id="header-search-portal" className="flex-1 max-w-sm mx-2 h-9" />

      {/* Right: Auth controls */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {loading && (
          <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
        )}

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <AvatarCircle profile={profile} email={user.email} />
              <span className="text-sm text-brown/70 font-medium hidden sm:block max-w-[100px] truncate">
                {profile?.username ?? user.email?.split('@')[0]}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-tuscany-lg py-1 min-w-[160px] z-50 border border-cream-dark">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-brown hover:bg-cream transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  👤 My Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-brown hover:bg-cream transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  ⚙️ Settings
                </Link>
                <div className="border-t border-cream-dark my-1" />
                <button
                  onClick={() => { onSignOut(); setDropdownOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-brown/60 hover:bg-cream hover:text-brown transition-colors text-left"
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        ) : guestName ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-brown/70 font-medium hidden sm:block">{guestName} (Guest)</span>
            <button
              onClick={onSignIn}
              className="text-xs text-terracotta hover:underline font-medium transition-colors"
            >
              Sign in
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="text-sm text-terracotta font-semibold hover:underline transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
