import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_CATEGORIES = [
  'pizzeria', 'classic_italian', 'beef_meat', 'seafood', 'vineyards',
  'hotels', 'sightseeing', 'views_panoramas', 'beaches', 'walking_trails',
  'mountains', 'home_residential', 'museums_galleries', 'local_markets',
  'pharmacy', 'taxi_station', 'train_station', 'shopping',
];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await getServiceClient().auth.getUser(token);
  return user ?? null;
}

// GET /api/lists — public: anyone can fetch the list of imported lists
export async function GET() {
  const { data, error } = await getServiceClient()
    .from('imported_lists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/lists — save a confirmed import (create list + locations)
export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  const guestName = request.headers.get('x-guest-name');

  if (!user && !guestName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { name, url, places = [] } = body;
  const serviceClient = getServiceClient();

  // Create the list record
  const { data: list, error: listError } = await serviceClient
    .from('imported_lists')
    .insert({
      name: name.trim(),
      url: url ?? null,
      imported_by: user?.id ?? null,
      guest_name: !user && guestName ? guestName : null,
      location_count: Array.isArray(places) ? places.length : 0,
    })
    .select()
    .single();

  if (listError || !list) {
    return NextResponse.json(
      { error: listError?.message ?? 'Failed to create list' },
      { status: 500 }
    );
  }

  // Insert locations if any were parsed
  if (Array.isArray(places) && places.length > 0) {
    const validPlaces = places
      .filter((p: any) => p?.lat && p?.lng && p?.name)
      .map((p: any) => ({
        name: String(p.name).slice(0, 120),
        category: VALID_CATEGORIES.includes(p.category) ? p.category : 'sightseeing',
        description: p.address ? String(p.address).slice(0, 500) : null,
        lat: Number(p.lat),
        lng: Number(p.lng),
        photo_url: null,
        created_by: user?.id ?? null,
        guest_name: !user && guestName ? guestName : null,
        imported_list_id: list.id,
      }));

    if (validPlaces.length > 0) {
      const { error: locError } = await serviceClient
        .from('locations')
        .insert(validPlaces);

      if (locError) {
        // Roll back list creation
        await serviceClient.from('imported_lists').delete().eq('id', list.id);
        return NextResponse.json({ error: locError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(list);
}
