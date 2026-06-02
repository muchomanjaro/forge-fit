import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

// GET /api/workouts/[id]/exercises — List exercises for a workout
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;

    // Verify the workout belongs to the user
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    const { data: exercises, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ exercises });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get exercises error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/workouts/[id]/exercises — Add an exercise to a workout
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const { id } = await params;
    const body = await request.json();

    // Verify the workout belongs to the user
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Validation
    if (!body.exercise_name || typeof body.exercise_name !== 'string' || body.exercise_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      );
    }

    if (body.sets !== undefined && (typeof body.sets !== 'number' || body.sets < 0)) {
      return NextResponse.json(
        { error: 'Sets must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.reps !== undefined && (typeof body.reps !== 'number' || body.reps < 0)) {
      return NextResponse.json(
        { error: 'Reps must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.weight_kg !== undefined && (typeof body.weight_kg !== 'number' || body.weight_kg < 0)) {
      return NextResponse.json(
        { error: 'Weight must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.rpe !== undefined && (typeof body.rpe !== 'number' || body.rpe < 1 || body.rpe > 10)) {
      return NextResponse.json(
        { error: 'RPE must be a number between 1 and 10' },
        { status: 400 }
      );
    }

    // Get next sort_order
    const { data: lastExercise } = await (supabase
      .from('workout_exercises')
      .select('sort_order')
      .eq('workout_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single() as any);

    const nextSortOrder = lastExercise ? lastExercise.sort_order + 1 : 1;

    const { data: exercise, error } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: id,
        exercise_name: body.exercise_name.trim(),
        sets: body.sets ?? null,
        reps: body.reps ?? null,
        weight_kg: body.weight_kg ?? null,
        rpe: body.rpe ?? null,
        notes: body.notes ?? null,
        sort_order: nextSortOrder,
      } as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Create exercise error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
