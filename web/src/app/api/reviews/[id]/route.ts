import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await getServiceClient().auth.getUser(token);
  return user ?? null;
}

// PATCH /api/reviews/[id] — edit a review (admin or guest bypass RLS)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = getServiceClient();
  const user = await resolveUser(request);
  const guestName = request.headers.get('x-guest-name');

  if (!user && !guestName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: review, error: fetchError } = await serviceClient
    .from('reviews').select('id, user_id, guest_name').eq('id', params.id).single();

  if (fetchError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  const isAdmin = !!(user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isAuthor = user ? review.user_id === user.id : review.guest_name === guestName;

  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rating, comment } = await request.json();
  const { data, error } = await serviceClient
    .from('reviews').update({ rating, comment }).eq('id', params.id).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/reviews/[id] — delete a review (admin or guest bypass RLS)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = getServiceClient();
  const user = await resolveUser(request);
  const guestName = request.headers.get('x-guest-name');

  if (!user && !guestName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: review, error: fetchError } = await serviceClient
    .from('reviews').select('id, user_id, guest_name').eq('id', params.id).single();

  if (fetchError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  const isAdmin = !!(user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isAuthor = user ? review.user_id === user.id : review.guest_name === guestName;

  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await serviceClient.from('reviews').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
