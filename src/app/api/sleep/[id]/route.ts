import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

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

    if (error) {
      return NextResponse.json(
        { error: 'Sleep log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ log });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get sleep log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const updates: Record<string, unknown> = {};
    const allowedFields = ['date', 'bedtime', 'wake_time', 'hours_slept', 'quality_rating', 'notes'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (updates.hours_slept !== undefined && (typeof updates.hours_slept !== 'number' || (updates.hours_slept as number) < 0 || (updates.hours_slept as number) > 24)) {
      return NextResponse.json(
        { error: 'Hours slept must be a number between 0 and 24' },
        { status: 400 }
      );
    }

    if (updates.quality_rating !== undefined && updates.quality_rating !== null) {
      if (typeof updates.quality_rating !== 'number' || (updates.quality_rating as number) < 1 || (updates.quality_rating as number) > 5) {
        return NextResponse.json(
          { error: 'Quality rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
    }

    const { data: log, error } = await ((supabase as any)
      .from('sleep_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Update sleep log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Delete sleep log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
