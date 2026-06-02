import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

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

    if (error) {
      return NextResponse.json(
        { error: 'Nutrition log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ log });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get nutrition log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const updates: Record<string, unknown> = {};
    const allowedFields = ['meal_type', 'logged_at', 'notes', 'total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g'];

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

    // Field validation
    if (updates.meal_type !== undefined && !VALID_MEAL_TYPES.includes(updates.meal_type as any)) {
      return NextResponse.json(
        { error: `Meal type must be one of: ${VALID_MEAL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const numericFields = ['total_calories', 'total_protein_g', 'total_carbs_g', 'total_fat_g'];
    for (const field of numericFields) {
      if (updates[field] !== undefined && (typeof updates[field] !== 'number' || (updates[field] as number) < 0)) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number` },
          { status: 400 }
        );
      }
    }

    const { data: log, error } = await ((supabase as any)
      .from('nutrition_logs')
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
    console.error('Update nutrition log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Delete nutrition log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
