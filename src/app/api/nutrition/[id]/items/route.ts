import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { createMealItemSchema } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';

// GET /api/nutrition/[id]/items — List meal items for a nutrition log
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    // Verify the nutrition log belongs to the user
    const { data: log, error: logError } = await supabase
      .from('nutrition_logs')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (logError || !log) {
      return notFoundError('Nutrition log not found');
    }

    const { data: items, error } = await supabase
      .from('meal_items')
      .select('*')
      .eq('nutrition_log_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return handleRouteError(error, 'meal-items:list');
  }
}

// POST /api/nutrition/[id]/items — Add a meal item to a nutrition log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;
    const { id } = await params;

    // Verify the nutrition log belongs to the user
    const { data: log, error: logError } = await supabase
      .from('nutrition_logs')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (logError || !log) {
      return notFoundError('Nutrition log not found');
    }

    const body = await request.json();
    const parsed = createMealItemSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Get next sort_order
    const { data: lastItem } = await sb
      .from('meal_items')
      .select('sort_order')
      .eq('nutrition_log_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastItem ? lastItem.sort_order + 1 : 1;

    const { data: item, error } = await sb
      .from('meal_items')
      .insert({
        nutrition_log_id: id,
        food_name: parsed.data.food_name,
        serving_size: parsed.data.serving_size ?? null,
        calories: parsed.data.calories,
        protein_g: parsed.data.protein_g,
        carbs_g: parsed.data.carbs_g,
        fat_g: parsed.data.fat_g,
        fiber_g: parsed.data.fiber_g ?? null,
        sugar_g: parsed.data.sugar_g ?? null,
        sodium_mg: parsed.data.sodium_mg ?? null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'meal-items:create');
  }
}
