import { useState, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';

export function useLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Please enable it in Settings.');
      setLoading(false);
      return;
    }

    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      setCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
    } catch (err) {
      setError('Could not get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { coords, loading, error, getCurrentLocation };
}
