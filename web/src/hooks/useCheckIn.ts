'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useCheckIn(locationId: string, guestName?: string | null) {
  const { user } = useAuth();
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Fetch total count
        const { count: total } = await (supabase as any)
          .from('check_ins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);

        if (!cancelled) setCount(total ?? 0);

        // Check if current user/guest has checked in
        if (user) {
          const { data } = await (supabase as any)
            .from('check_ins')
            .select('id')
            .eq('location_id', locationId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (!cancelled) setHasCheckedIn(!!data);
        } else if (guestName) {
          const { data } = await (supabase as any)
            .from('check_ins')
            .select('id')
            .eq('location_id', locationId)
            .eq('guest_name', guestName)
            .is('user_id', null)
            .maybeSingle();
          if (!cancelled) setHasCheckedIn(!!data);
        }
      } catch {
        // Table may not exist yet — silently ignore
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [locationId, user, guestName]);

  const toggle = useCallback(async () => {
    if (!user && !guestName) return;
    setLoading(true);

    try {
      if (hasCheckedIn) {
        let query = (supabase as any).from('check_ins').delete().eq('location_id', locationId);
        if (user) {
          query = query.eq('user_id', user.id);
        } else {
          query = query.eq('guest_name', guestName).is('user_id', null);
        }
        await query;
        setHasCheckedIn(false);
        setCount(c => Math.max(0, c - 1));
      } else {
        await (supabase as any).from('check_ins').insert({
          location_id: locationId,
          user_id: user?.id ?? null,
          guest_name: !user && guestName ? guestName : null,
        });
        setHasCheckedIn(true);
        setCount(c => c + 1);
      }
    } catch {
      // ignore errors (table not yet created)
    } finally {
      setLoading(false);
    }
  }, [hasCheckedIn, locationId, user, guestName]);

  return { hasCheckedIn, count, loading, toggle, canCheckIn: !!(user || guestName) };
}
