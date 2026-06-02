import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

// GET /api/gamification/achievements — Get all achievements and the user's progress
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    // Get all available achievements
    const { data: allAchievements, error: achievementsError } = await (supabase
      .from('achievements')
      .select('*')
      .order('xp_reward', { ascending: false }) as any);

    if (achievementsError) {
      return NextResponse.json({ error: achievementsError.message }, { status: 400 });
    }

    // Get user's unlocked achievements
    const { data: userAchievements, error: userAchievementsError } = await (supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', user.id) as any);

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
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
