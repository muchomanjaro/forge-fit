import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

// GET /api/nutrition — List nutrition logs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const mealType = searchParams.get('meal_type');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    let query = supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (date) {
      // Filter by date (YYYY-MM-DD)
      query = query.gte('logged_at', `${date}T00:00:00Z`).lte('logged_at', `${date}T23:59:59Z`);
    }

    if (mealType && VALID_MEAL_TYPES.includes(mealType as any)) {
      query = query.eq('meal_type', mealType);
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
    console.error('Get nutrition logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/nutrition — Create a new nutrition log entry
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    // Validation
    if (!body.meal_type || !VALID_MEAL_TYPES.includes(body.meal_type)) {
      return NextResponse.json(
        { error: `Meal type must be one of: ${VALID_MEAL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.total_calories !== undefined && (typeof body.total_calories !== 'number' || body.total_calories < 0)) {
      return NextResponse.json(
        { error: 'Total calories must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.total_protein_g !== undefined && (typeof body.total_protein_g !== 'number' || body.total_protein_g < 0)) {
      return NextResponse.json(
        { error: 'Total protein must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.total_carbs_g !== undefined && (typeof body.total_carbs_g !== 'number' || body.total_carbs_g < 0)) {
      return NextResponse.json(
        { error: 'Total carbs must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.total_fat_g !== undefined && (typeof body.total_fat_g !== 'number' || body.total_fat_g < 0)) {
      return NextResponse.json(
        { error: 'Total fat must be a non-negative number' },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        meal_type: body.meal_type,
        logged_at: body.logged_at ?? new Date().toISOString(),
        notes: body.notes ?? null,
        total_calories: body.total_calories ?? 0,
        total_protein_g: body.total_protein_g ?? 0,
        total_carbs_g: body.total_carbs_g ?? 0,
        total_fat_g: body.total_fat_g ?? 0,
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
    console.error('Create nutrition log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
