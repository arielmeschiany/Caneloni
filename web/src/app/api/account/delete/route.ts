import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // Use a regular client to verify the token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Admin client for privileged operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete user data in order (reviews, locations, profile)
  const { error: reviewsError } = await adminClient
    .from('reviews')
    .delete()
    .eq('user_id', userId);

  if (reviewsError) {
    return NextResponse.json({ error: 'Failed to delete reviews' }, { status: 500 });
  }

  const { error: locationsError } = await adminClient
    .from('locations')
    .delete()
    .eq('created_by', userId);

  if (locationsError) {
    return NextResponse.json({ error: 'Failed to delete locations' }, { status: 500 });
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }

  // Delete the auth user
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
