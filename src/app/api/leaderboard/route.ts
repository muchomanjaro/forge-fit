import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { leaderboardQuerySchema, calculateLevel } from '@/lib/validation';
import { validationError, handleRouteError } from '@/lib/errors';

// GET /api/leaderboard — Get top users by XP/level
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    const searchParams = request.nextUrl.searchParams;
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => { rawParams[key] = value; });

    const parsed = leaderboardQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { period, limit, offset } = parsed.data;

    // Get top users ordered by XP descending
    const { data: topUsers, error: usersError, count } = await sb
      .from('users')
      .select('id, display_name, xp, level, avatar_url', { count: 'exact' })
      .order('xp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    // Get the requesting user's rank and info
    const { data: userData } = await sb
      .from('users')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    // Count users with more XP to determine rank
    const { count: rank } = await sb
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('xp', userData?.xp ?? 0);

    const enrichedUsers = (topUsers || []).map((u: any, i: number) => ({
      id: u.id,
      display_name: u.display_name,
      xp: u.xp,
      level: u.level || calculateLevel(u.xp),
      avatar_url: u.avatar_url,
      rank: offset + i + 1,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total_count: count ?? 0,
      user_rank: {
        id: user.id,
        xp: userData?.xp ?? 0,
        level: userData?.level || calculateLevel(userData?.xp ?? 0),
        rank: (rank ?? 0) + 1,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'leaderboard:list');
  }
}
