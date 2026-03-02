import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '';

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

// DELETE /api/lists/[id] — importer or admin only; cascade removes all its locations
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

  const { data: list, error: fetchError } = await serviceClient
    .from('imported_lists')
    .select('id, imported_by, guest_name')
    .eq('id', params.id)
    .single();

  if (fetchError || !list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const isAdmin = !!(user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isImporter = user
    ? list.imported_by === user.id
    : list.guest_name === guestName;

  if (!isAdmin && !isImporter) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Deleting the list cascades to locations → cascades to reviews (via migration 004)
  const { error: deleteError } = await serviceClient
    .from('imported_lists')
    .delete()
    .eq('id', params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
