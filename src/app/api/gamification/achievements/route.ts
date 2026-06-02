import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { handleRouteError } from '@/lib/errors';

// GET /api/gamification/achievements — Get all achievements and the user's progress
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    // Get all available achievements
    const { data: allAchievements, error: achievementsError } = await sb
      .from('achievements')
      .select('*')
      .order('xp_reward', { ascending: false });

    if (achievementsError) {
      return NextResponse.json({ error: achievementsError.message }, { status: 400 });
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userAchievementsError } = await sb
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', user.id);

    if (userAchievementsError) {
      return NextResponse.json({ error: userAchievementsError.message }, { status: 400 });
    }

    // Build a set of unlocked achievement IDs
    const unlockedIds = new Set(
      (userAchievements || []).map((ua: any) => ua.achievement_id)
    );

    // Merge with progress info
    const achievements = (allAchievements || []).map((ach: any) => ({
      ...ach,
      unlocked: unlockedIds.has(ach.id),
      unlocked_at: (userAchievements || []).find(
        (ua: any) => ua.achievement_id === ach.id
      )?.unlocked_at || null,
    }));

    return NextResponse.json({
      achievements,
      total_count: achievements.length,
      unlocked_count: unlockedIds.size,
    });
  } catch (error) {
    return handleRouteError(error, 'achievements:list');
  }
}
