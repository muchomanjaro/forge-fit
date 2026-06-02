import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { createExerciseSchema } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';

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
      return notFoundError('Workout not found');
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
  } catch (error) {
    return handleRouteError(error, 'exercises:list');
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
    const sb = supabase as any;
    const { id } = await params;

    // Verify the workout belongs to the user
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return notFoundError('Workout not found');
    }

    const body = await request.json();
    const parsed = createExerciseSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    // Get next sort_order
    const { data: lastExercise } = await sb
      .from('workout_exercises')
      .select('sort_order')
      .eq('workout_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastExercise ? lastExercise.sort_order + 1 : 1;

    const { data: exercise, error } = await sb
      .from('workout_exercises')
      .insert({
        workout_id: id,
        exercise_name: parsed.data.exercise_name,
        sets: parsed.data.sets ?? null,
        reps: parsed.data.reps ?? null,
        weight_kg: parsed.data.weight_kg ?? null,
        rpe: parsed.data.rpe ?? null,
        notes: parsed.data.notes ?? null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'exercises:create');
  }
}
