import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { createSleepSchema, updateSleepSchema } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';

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
  } catch (error) {
    return handleRouteError(error, 'sleep:list');
  }
}

// POST /api/sleep — Create a new sleep log entry
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const parsed = createSleepSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { data: log, error } = await supabase
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        date: parsed.data.date,
        bedtime: parsed.data.bedtime,
        wake_time: parsed.data.wake_time,
        hours_slept: parsed.data.hours_slept,
        quality_rating: parsed.data.quality_rating ?? null,
        notes: parsed.data.notes ?? null,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'sleep:create');
  }
}
