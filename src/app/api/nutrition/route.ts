import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { createNutritionSchema, VALID_MEAL_TYPES } from '@/lib/validation';
import { validationError, handleRouteError } from '@/lib/errors';

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
  } catch (error) {
    return handleRouteError(error, 'nutrition:list');
  }
}

// POST /api/nutrition — Create a new nutrition log entry
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const parsed = createNutritionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { data: log, error } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        meal_type: parsed.data.meal_type,
        logged_at: parsed.data.logged_at ?? new Date().toISOString(),
        notes: parsed.data.notes ?? null,
        total_calories: parsed.data.total_calories,
        total_protein_g: parsed.data.total_protein_g,
        total_carbs_g: parsed.data.total_carbs_g,
        total_fat_g: parsed.data.total_fat_g,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'nutrition:create');
  }
}
