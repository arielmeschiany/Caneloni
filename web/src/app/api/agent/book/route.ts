import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_ACTION_TYPES = ['reserve_table', 'book_hotel', 'buy_ticket'] as const;
type ActionType = typeof VALID_ACTION_TYPES[number];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { location_id, action_type, preferences } = body;

  if (!location_id || !action_type) {
    return NextResponse.json({ error: 'Missing required fields: location_id, action_type' }, { status: 400 });
  }

  if (!VALID_ACTION_TYPES.includes(action_type as ActionType)) {
    return NextResponse.json({
      error: `Invalid action_type. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
    }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from('agent_sessions')
    .insert({
      user_id: user.id,
      location_id,
      action_type,
      status: 'initiated',
      preferences: preferences ?? {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    session_id: data.id,
    status: 'initiated',
    message: 'Agent session created. Claude integration pending.',
  }, { status: 201 });
}
