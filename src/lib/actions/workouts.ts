// Forge Fit — Workout Server Actions
'use server';

import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  createExerciseSchema,
  calculateWorkoutXp,
  calculateLevel,
} from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: { path: string; message: string }[] };

/**
 * Create a new workout with optional exercises.
 */
export async function createWorkout(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const raw = Object.fromEntries(formData.entries());
    const parsed = createWorkoutSchema.safeParse({
      ...raw,
      category: raw.category,
      duration_minutes: raw.duration_minutes ? Number(raw.duration_minutes) : undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }

    const { data: workout, error } = await ((supabase as any)
      .from('workouts')
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        category: parsed.data.category,
        duration_minutes: parsed.data.duration_minutes,
        started_at: parsed.data.started_at ?? null,
        completed_at: parsed.data.completed_at ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single());

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/workouts');
    return { success: true, data: { workout } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Create workout action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Complete a workout: validates exercises, calculates XP, updates user XP.
 */
export async function completeWorkout(
  workoutId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    // Get the workout
    const { data: workout, error: workoutError } = await sb
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return { success: false, error: 'Workout not found' };
    }

    // Get exercises
    const { data: exercises } = await sb
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId);

    const exerciseCount = (exercises || []).length;
    const avgRpe =
      (exercises || []).filter((e: any) => e.rpe !== null).length > 0
        ? (exercises || []).reduce((sum: number, e: any) => sum + (e.rpe || 0), 0) /
          (exercises || []).filter((e: any) => e.rpe !== null).length
        : null;

    const xpEarned = calculateWorkoutXp(
      workout.duration_minutes,
      exerciseCount,
      avgRpe
    );

    // Update workout with completion time and XP
    const now = new Date().toISOString();
    const { error: updateError } = await sb
      .from('workouts')
      .update({ completed_at: now, xp_earned: xpEarned })
      .eq('id', workoutId)
      .eq('user_id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update user XP and level
    const { data: userData } = await sb
      .from('users')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    const newXp = (userData?.xp ?? 0) + xpEarned;
    const newLevel = calculateLevel(newXp);

    await sb
      .from('users')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user.id);

    // Update streaks
    const today = now.split('T')[0];
    await sb.rpc('increment_streak', {
      p_user_id: user.id,
      p_streak_type: 'workout',
      p_activity_date: today,
    });

    revalidatePath('/workouts');
    revalidatePath('/progress');
    return {
      success: true,
      data: { xp_earned: xpEarned, total_xp: newXp, level: newLevel },
    };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Complete workout action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Add an exercise to a workout.
 */
export async function addExercise(
  workoutId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    // Verify ownership
    const { data: workout } = await sb
      .from('workouts')
      .select('id')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single();

    if (!workout) {
      return { success: false, error: 'Workout not found' };
    }

    const raw = Object.fromEntries(formData.entries());
    const parsed = createExerciseSchema.safeParse({
      ...raw,
      sets: raw.sets ? Number(raw.sets) : undefined,
      reps: raw.reps ? Number(raw.reps) : undefined,
      weight_kg: raw.weight_kg ? Number(raw.weight_kg) : undefined,
      rpe: raw.rpe ? Number(raw.rpe) : undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }

    // Get next sort order
    const { data: lastExercise } = await sb
      .from('workout_exercises')
      .select('sort_order')
      .eq('workout_id', workoutId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = lastExercise ? lastExercise.sort_order + 1 : 1;

    const { data: exercise, error } = await sb
      .from('workout_exercises')
      .insert({
        workout_id: workoutId,
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
      return { success: false, error: error.message };
    }

    revalidatePath(`/workouts/${workoutId}`);
    return { success: true, data: { exercise } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Add exercise action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
