import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { calculateLevel } from '@/lib/validation';
import { handleRouteError } from '@/lib/errors';

// GET /api/gamification/xp — Get the user's XP summary and level
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    // Get user XP from users table
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Calculate level from XP
    const calculatedLevel = calculateLevel(userData?.xp ?? 0);

    // Get recent XP-earning workouts
    const { data: recentWorkouts } = await sb
      .from('workouts')
      .select('id, name, xp_earned, completed_at')
      .eq('user_id', user.id)
      .not('xp_earned', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      total_xp: userData?.xp ?? 0,
      current_level: userData?.level || calculatedLevel,
      calculated_level: calculatedLevel,
      recent_xp_breakdown: recentWorkouts || [],
    });
  } catch (error) {
    return handleRouteError(error, 'xp:get');
  }
}
