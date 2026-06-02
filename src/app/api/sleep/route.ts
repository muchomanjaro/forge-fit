import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

// GET /api/sleep — List sleep logs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    let query = supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (date) {
      query = query.eq('date', date);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ logs });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get sleep logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sleep — Create a new sleep log entry
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    // Validation
    if (!body.date || typeof body.date !== 'string') {
      return NextResponse.json(
        { error: 'Date is required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    if (!body.bedtime || typeof body.bedtime !== 'string') {
      return NextResponse.json(
        { error: 'Bedtime is required (ISO 8601 format)' },
        { status: 400 }
      );
    }

    if (!body.wake_time || typeof body.wake_time !== 'string') {
      return NextResponse.json(
        { error: 'Wake time is required (ISO 8601 format)' },
        { status: 400 }
      );
    }

    if (body.hours_slept !== undefined && (typeof body.hours_slept !== 'number' || body.hours_slept < 0 || body.hours_slept > 24)) {
      return NextResponse.json(
        { error: 'Hours slept must be a number between 0 and 24' },
        { status: 400 }
      );
    }

    if (body.quality_rating !== undefined && body.quality_rating !== null) {
      if (typeof body.quality_rating !== 'number' || body.quality_rating < 1 || body.quality_rating > 5) {
        return NextResponse.json(
          { error: 'Quality rating must be a number between 1 and 5' },
          { status: 400 }
        );
      }
    }

    const { data: log, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        date: body.date,
        bedtime: body.bedtime,
        wake_time: body.wake_time,
        hours_slept: body.hours_slept ?? 0,
        quality_rating: body.quality_rating ?? null,
        notes: body.notes ?? null,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Create sleep log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
