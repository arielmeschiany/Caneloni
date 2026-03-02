import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface ParsedPlace {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  category: string;
}

const TYPE_TO_CATEGORY: Record<string, string> = {
  restaurant: 'classic_italian',
  cafe: 'classic_italian',
  bakery: 'classic_italian',
  bar: 'classic_italian',
  food: 'classic_italian',
  pizza_restaurant: 'pizzeria',
  lodging: 'hotels',
  museum: 'museums_galleries',
  art_gallery: 'museums_galleries',
  tourist_attraction: 'sightseeing',
  point_of_interest: 'sightseeing',
  natural_feature: 'views_panoramas',
  park: 'walking_trails',
  beach: 'beaches',
  pharmacy: 'pharmacy',
  grocery_or_supermarket: 'local_markets',
  market: 'local_markets',
  transit_station: 'train_station',
  train_station: 'train_station',
  taxi_stand: 'taxi_station',
  shopping_mall: 'shopping',
  store: 'shopping',
  clothing_store: 'shopping',
};

function guessCategory(types: string[]): string {
  for (const t of types) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  }
  return 'sightseeing';
}

async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    return res.url;
  } catch {
    return url;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  return res.text();
}

function extractTitle(html: string): string {
  // Try og:title first
  const ogMatch =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i);
  if (ogMatch) return ogMatch[1].replace(/ - Google Maps$/i, '').trim();

  // Fall back to <title>
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].replace(/ - Google Maps$/i, '').trim();

  return '';
}

function extractPlaceIds(html: string): string[] {
  const matches = html.match(/ChIJ[a-zA-Z0-9_-]{10,45}/g) ?? [];
  return [...new Set(matches)].slice(0, 20);
}

async function enrichPlaceId(placeId: string): Promise<ParsedPlace | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,geometry,formatted_address,types&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result?.geometry?.location) return null;
    return {
      name: data.result.name,
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
      address: data.result.formatted_address ?? null,
      category: guessCategory(data.result.types ?? []),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let listName = '';
  let places: ParsedPlace[] = [];
  let warning: string | null = null;

  try {
    const resolvedUrl = await resolveUrl(body.url.trim());
    const html = await fetchHtml(resolvedUrl);

    listName = extractTitle(html);

    const placeIds = extractPlaceIds(html);
    if (placeIds.length > 0 && GOOGLE_MAPS_API_KEY) {
      const results = await Promise.allSettled(placeIds.map(enrichPlaceId));
      places = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => (r as PromiseFulfilledResult<ParsedPlace>).value);
    }

    if (places.length === 0) {
      warning =
        "Google Maps lists use browser rendering, so places couldn't be extracted automatically. " +
        "You can still create a named list — pins added later can be linked to it.";
    }
  } catch (err) {
    console.error('[lists/import] parse error:', err);
    warning = "Couldn't fetch that URL. Make sure it's a public Google Maps link.";
  }

  return NextResponse.json({
    name: listName || 'My List',
    places,
    warning,
  });
}
