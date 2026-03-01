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
      setLocations((data as Location[]) ?? []);
    } catch {
      // Fallback to basic table
      const { data, error: fallbackErr } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackErr) setError(fallbackErr.message);
      else setLocations((data as Location[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();

    const channel = supabase
      .channel('locations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchLocations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLocations]);

  const addLocation = useCallback(
    async (location: NewLocation, userId: string): Promise<Location> => {
      const { data, error } = await supabase
        .from('locations')
        .insert({ ...location, created_by: userId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Location;
    },
    []
  );

  return { locations, loading, error, addLocation, refetch: fetchLocations };
}
