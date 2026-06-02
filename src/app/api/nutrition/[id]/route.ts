import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { updateNutritionSchema, VALID_MEAL_TYPES } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';

// GET /api/nutrition/[id] — Get a specific nutrition log entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    const { data: log, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !log) {
      return notFoundError('Nutrition log not found');
    }

    return NextResponse.json({ log });
  } catch (error) {
    return handleRouteError(error, 'nutrition:get');
  }
}

// PUT /api/nutrition/[id] — Update a nutrition log entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;
    const body = await request.json();

    const parsed = updateNutritionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: log, error } = await supabase
      .from('nutrition_logs')
      .update(parsed.data as any)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    return handleRouteError(error, 'nutrition:update');
  }
}

// DELETE /api/nutrition/[id] — Delete a nutrition log entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    const { error } = await supabase
      .from('nutrition_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Nutrition log deleted successfully' });
  } catch (error) {
    return handleRouteError(error, 'nutrition:delete');
  }
}
