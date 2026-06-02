import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import type { Database } from '@/types/database';

type GoalInsert = Database['public']['Tables']['user_goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['user_goals']['Update'];

const VALID_GOAL_TYPES = ['weight_loss', 'muscle', 'endurance', 'flexibility', 'wellness', 'longevity'];

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
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ goals });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/goals — Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    if (!body.goal_type || !VALID_GOAL_TYPES.includes(body.goal_type)) {
      return NextResponse.json(
        { error: `Goal type must be one of: ${VALID_GOAL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.priority !== undefined && (typeof body.priority !== 'number' || body.priority < 1)) {
      return NextResponse.json(
        { error: 'Priority must be a positive number' },
        { status: 400 }
      );
    }

    if (body.target_value !== undefined && typeof body.target_value !== 'number') {
      return NextResponse.json(
        { error: 'Target value must be a number' },
        { status: 400 }
      );
    }

    const insert: GoalInsert = {
      user_id: user.id,
      goal_type: body.goal_type,
      priority: body.priority ?? 1,
      target_value: body.target_value ?? null,
    };

    const { data: goal, error } = await ((supabase as any)
      .from('user_goals')
      .insert(insert)
      .select()
      .single());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Create goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      return NextResponse.json(
        { error: 'Missing goal id' },
        { status: 400 }
      );
    }

    const updates: GoalUpdate = {};

    if (fields.goal_type !== undefined) {
      if (!VALID_GOAL_TYPES.includes(fields.goal_type)) {
        return NextResponse.json(
          { error: `Goal type must be one of: ${VALID_GOAL_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.goal_type = fields.goal_type;
    }

    if (fields.priority !== undefined) {
      if (typeof fields.priority !== 'number' || fields.priority < 1) {
        return NextResponse.json(
          { error: 'Priority must be a positive number' },
          { status: 400 }
        );
      }
      updates.priority = fields.priority;
    }

    if (fields.target_value !== undefined) {
      if (fields.target_value !== null && typeof fields.target_value !== 'number') {
        return NextResponse.json(
          { error: 'Target value must be a number or null' },
          { status: 400 }
        );
      }
      updates.target_value = fields.target_value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: goal, error } = await ((supabase as any)
      .from('user_goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Update goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user/goals — Delete a goal (requires goal id in body or query)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing goal id query parameter' },
        { status: 400 }
      );
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
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Delete goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
