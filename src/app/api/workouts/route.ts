import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

const VALID_CATEGORIES = ['cardio', 'strength', 'flexibility'] as const;

// GET /api/workouts — List workouts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    let query = supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && VALID_CATEGORIES.includes(category as any)) {
      query = query.eq('category', category);
    }

    const { data: workouts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workouts });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get workouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/workouts — Create a new workout
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workout name is required' },
        { status: 400 }
      );
    }

    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.duration_minutes !== undefined && (typeof body.duration_minutes !== 'number' || body.duration_minutes < 0)) {
      return NextResponse.json(
        { error: 'Duration must be a non-negative number' },
        { status: 400 }
      );
    }

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        category: body.category,
        duration_minutes: body.duration_minutes ?? 0,
        started_at: body.started_at ?? null,
        completed_at: body.completed_at ?? null,
        notes: body.notes ?? null,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Create workout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
