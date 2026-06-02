import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

/**
 * Calculate XP earned for a workout.
 * Formula: 10 base + 2 per exercise + round(duration_minutes * 0.5) + round(rpe * 1.5)
 */
function calculateWorkoutXp(
  durationMinutes: number,
  exerciseCount: number,
  avgRpe: number | null
): number {
  let xp = 10; // Base XP
  xp += exerciseCount * 2;
  xp += Math.round(durationMinutes * 0.5);

  if (avgRpe !== null && avgRpe > 0) {
    xp += Math.round(avgRpe * 1.5);
  }

  return Math.max(0, xp);
}

/**
 * Calculate level from total XP.
 * Formula: level = floor(sqrt(xp / 100)) + 1
 */
function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

// GET /api/gamification/xp — Get the user's XP summary and level
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    // Get user XP from auth metadata and users table
    const { data: userData, error: userError } = await (supabase
      .from('users')
      .select('xp, level')
      .eq('id', user.id)
      .single() as any);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Calculate level from XP
    const calculatedLevel = calculateLevel(userData?.xp ?? 0);

    // Get recent XP-earning workouts
    const { data: recentWorkouts } = await (supabase
      .from('workouts')
      .select('id, name, xp_earned, completed_at')
      .eq('user_id', user.id)
      .not('xp_earned', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10) as any);

    return NextResponse.json({
      total_xp: userData?.xp ?? 0,
      current_level: userData?.level || calculatedLevel,
      calculated_level: calculatedLevel,
      recent_xp_breakdown: recentWorkouts || [],
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get XP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
