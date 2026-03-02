import { useState, useCallback } from 'react';

const STORAGE_KEY = 'canaloni_guest_name';

export function useGuest() {
  const [guestName, setGuestNameState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  );

  const setGuestName = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setGuestNameState(name);
  }, []);

  const clearGuest = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGuestNameState(null);
  }, []);

  return { guestName, setGuestName, clearGuest };
}
