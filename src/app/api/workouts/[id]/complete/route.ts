import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { calculateWorkoutXp, calculateLevel } from '@/lib/validation';
import { notFoundError, conflictError, handleRouteError } from '@/lib/errors';

// POST /api/workouts/[id]/complete — Complete a workout with XP calculation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;
    const { id } = await params;

    // Get the workout
    const { data: workout, error: workoutError } = await sb
      .from('workouts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (workoutError || !workout) {
      return notFoundError('Workout not found');
    }

    if (workout.completed_at) {
      return conflictError('Workout is already completed');
    }

    // Get exercises for XP calculation
    const { data: exercises } = await sb
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', id);

    const exerciseCount = (exercises || []).length;
    const exercisesWithRpe = (exercises || []).filter((e: any) => e.rpe !== null);

    const avgRpe =
      exercisesWithRpe.length > 0
        ? exercisesWithRpe.reduce((sum: number, e: any) => sum + (e.rpe || 0), 0) /
          exercisesWithRpe.length
        : null;

    const xpEarned = calculateWorkoutXp(
      workout.duration_minutes,
      exerciseCount,
      avgRpe
    );

    const now = new Date().toISOString();

    // Update workout with completion time and XP
    const { error: updateError } = await sb
      .from('workouts')
      .update({ completed_at: now, xp_earned: xpEarned })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
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

    // Update workout streak
    const today = now.split('T')[0];
    await sb.rpc('increment_streak', {
      p_user_id: user.id,
      p_streak_type: 'workout',
      p_activity_date: today,
    });

    return NextResponse.json({
      completed: true,
      xp_earned: xpEarned,
      total_xp: newXp,
      level: newLevel,
    });
  } catch (error) {
    return handleRouteError(error, 'workout:complete');
  }
}
