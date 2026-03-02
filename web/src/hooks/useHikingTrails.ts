'use client';

import { useState, useCallback } from 'react';

export interface HikingTrail {
  id: number;
  name: string;
  distance?: number;
  difficulty?: string;
  coordinates: { lat: number; lng: number }[];
}

const OVERPASS_QUERY = `[out:json][timeout:30];
relation[route=hiking](42.3,9.7,44.5,12.4);
out geom;`;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function parseTrails(data: any): HikingTrail[] {
  if (!data?.elements) return [];

  return data.elements
    .filter((el: any) => el.type === 'relation')
    .map((rel: any): HikingTrail => {
      // Collect coordinates from way members that have geometry
      const coordinates: { lat: number; lng: number }[] = [];
      if (Array.isArray(rel.members)) {
        for (const member of rel.members) {
          if (member.type === 'way' && Array.isArray(member.geometry)) {
            for (const pt of member.geometry) {
              if (pt.lat != null && pt.lon != null) {
                coordinates.push({ lat: pt.lat, lng: pt.lon });
              }
            }
          }
        }
      }

      const tags = rel.tags ?? {};
      // distance in meters: try distance tag (may be in km), or length
      let distance: number | undefined;
      if (tags.distance) {
        const d = parseFloat(tags.distance);
        if (!isNaN(d)) {
          // Overpass distance tag is typically in km
          distance = d * 1000;
        }
      }

      return {
        id: rel.id,
        name: tags.name ?? tags['name:en'] ?? '',
        distance,
        difficulty: tags.difficulty ?? tags.sac_scale ?? undefined,
        coordinates,
      };
    })
    .filter((t: HikingTrail) => t.coordinates.length > 1);
}

export function useHikingTrails() {
  const [trails, setTrails] = useState<HikingTrail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchTrails = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });
      if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
      const data = await res.json();
      setTrails(parseTrails(data));
      setFetched(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load trails');
    } finally {
      setLoading(false);
    }
  }, [fetched, loading]);

  return { trails, loading, error, fetchTrails };
}
