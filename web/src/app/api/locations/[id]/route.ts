import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await (supabase as any)
    .from('locations_with_stats')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Verify requesting user via their token
  const userClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role for privileged delete (bypasses RLS), fall back to anon
  const privilegedClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : (supabase as any);

  // Fetch location to verify ownership
  const { data: location, error: fetchError } = await privilegedClient
    .from('locations')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (fetchError || !location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const isOwner = location.created_by === user.id;
  const isAdmin = ADMIN_EMAIL !== '' && user.email === ADMIN_EMAIL;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: deleteError } = await privilegedClient
    .from('locations')
    .delete()
    .eq('id', params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const userClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const privilegedClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : (supabase as any);

  const { data: location, error: fetchError } = await privilegedClient
    .from('locations')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (fetchError || !location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const isOwner = location.created_by === user.id;
  const isAdmin = ADMIN_EMAIL !== '' && user.email === ADMIN_EMAIL;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, category, description, photo_url } = body;

  if (!name || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const validCategories = [
    'pizzeria', 'classic_italian', 'beef_meat', 'seafood', 'vineyards',
    'hotels', 'sightseeing', 'views_panoramas', 'beaches', 'walking_trails',
    'mountains', 'home_residential', 'museums_galleries', 'local_markets',
    'pharmacy', 'taxi_station', 'train_station', 'shopping',
  ];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await privilegedClient
    .from('locations')
    .update({
      name,
      category,
      description: description ?? null,
      photo_url: photo_url ?? null,
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
