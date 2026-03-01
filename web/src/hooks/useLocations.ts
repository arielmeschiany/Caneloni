'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Location, NewLocation } from '@canaloni/shared';
import { supabase } from '@/lib/supabase';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('locations_with_stats' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocations((data as unknown as Location[]) ?? []);
    } catch (err: any) {
      // Fall back to basic locations table if view doesn't exist yet
      const { data, error: fallbackError } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackError) {
        setError(fallbackError.message);
      } else {
        setLocations((data as Location[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('locations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchLocations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLocations]);

  const addLocation = useCallback(
    async (location: NewLocation, userId: string): Promise<Location | null> => {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          ...location,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Location;
    },
    []
  );

  return { locations, loading, error, addLocation, refetch: fetchLocations };
}

export function useLocation(id: string) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchLocation = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('locations_with_stats' as any)
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLocation(data as unknown as Location);
      } catch {
        // Fall back to basic table
        const { data, error: fallbackError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .single();

        if (fallbackError) setError(fallbackError.message);
        else setLocation(data as Location);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [id]);

  return { location, loading, error };
}
