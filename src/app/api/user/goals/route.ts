import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { createGoalSchema, updateGoalSchema, VALID_GOAL_TYPES } from '@/lib/validation';
import { validationError, handleRouteError } from '@/lib/errors';

// GET /api/user/goals — Get all goals for the authenticated user
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    return handleRouteError(error, 'goals:list');
  }
}

// POST /api/user/goals — Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { data: goal, error } = await supabase
      .from('user_goals')
      .insert({
        user_id: user.id,
        goal_type: parsed.data.goal_type,
        priority: parsed.data.priority,
        target_value: parsed.data.target_value ?? null,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'goals:create');
  }
}

// PUT /api/user/goals — Update a goal (requires goal id in body)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    const parsed = updateGoalSchema.safeParse({ id, ...fields });
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { id: goalId, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: goal, error } = await (supabase as any)
      .from('user_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    return handleRouteError(error, 'goals:update');
  }
}

// DELETE /api/user/goals — Delete a goal (requires goal id query param)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing goal id query parameter' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    return handleRouteError(error, 'goals:delete');
  }
}
