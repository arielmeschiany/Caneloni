'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ImportedList } from '@canaloni/shared';

export function useImportedLists() {
  const [lists, setLists] = useState<ImportedList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('imported_lists')
      .select('*')
      .order('created_at', { ascending: false });
    setLists((data as ImportedList[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLists();

    const channel = supabase
      .channel('imported_lists_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imported_lists' }, fetchLists)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLists]);

  const addList = useCallback((list: ImportedList) => {
    setLists(prev => [list, ...prev]);
  }, []);

  const removeList = useCallback((id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
  }, []);

  return { lists, loading, addList, removeList, refetch: fetchLists };
}
