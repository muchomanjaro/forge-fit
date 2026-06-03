import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { updateSleepSchema } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';

// GET /api/sleep/[id] — Get a specific sleep log entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    const { data: log, error } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !log) {
      return notFoundError('Sleep log not found');
    }

    return NextResponse.json({ log });
  } catch (error) {
    return handleRouteError(error, 'sleep:get');
  }
}

// PUT /api/sleep/[id] — Update a sleep log entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;
    const body = await request.json();

    const parsed = updateSleepSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: log, error } = await (supabase as any)
      .from('sleep_logs')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    return handleRouteError(error, 'sleep:update');
  }
}

// DELETE /api/sleep/[id] — Delete a sleep log entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Sleep log deleted successfully' });
  } catch (error) {
    return handleRouteError(error, 'sleep:delete');
  }
}
