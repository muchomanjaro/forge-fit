import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';

const VALID_PERIODS = ['week', 'month', '3months'] as const;

/**
 * Get the date range for a given period.
 */
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0]; // today

  let start: Date;
  switch (period) {
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case '3months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 7);
  }

  return { start: start.toISOString().split('T')[0], end };
}

// GET /api/stats — Get aggregated stats for the user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const period = request.nextUrl.searchParams.get('period') || 'week';

    if (!VALID_PERIODS.includes(period as any)) {
      return NextResponse.json(
        { error: `Period must be one of: ${VALID_PERIODS.join(', ')}` },
        { status: 400 }
      );
    }

    const { start, end } = getDateRange(period);

    // Workout stats
    const { data: workouts } = await (supabase
      .from('workouts')
      .select('id, category, duration_minutes, xp_earned, completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', start)
      .lte('completed_at', `${end}T23:59:59Z`)
      .order('completed_at', { ascending: false }) as any);

    const totalWorkouts = (workouts || []).length;
    const totalDuration = (workouts || []).reduce(
      (sum: number, w: any) => sum + (w.duration_minutes || 0),
      0
    );
    const totalXpFromWorkouts = (workouts || []).reduce(
      (sum: number, w: any) => sum + (w.xp_earned || 0),
      0
    );

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    (workouts || []).forEach((w: any) => {
      categoryBreakdown[w.category] = (categoryBreakdown[w.category] || 0) + 1;
    });

    // Nutrition stats
    const { data: nutritionLogs } = await (supabase
      .from('nutrition_logs')
      .select('logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g')
      .eq('user_id', user.id)
      .gte('logged_at', `${start}T00:00:00Z`)
      .lte('logged_at', `${end}T23:59:59Z`) as any);

    const totalCalories = (nutritionLogs || []).reduce(
      (sum: number, n: any) => sum + (n.total_calories || 0),
      0
    );
    const totalProtein = (nutritionLogs || []).reduce(
      (sum: number, n: any) => sum + (n.total_protein_g || 0),
      0
    );
    const totalCarbs = (nutritionLogs || []).reduce(
      (sum: number, n: any) => sum + (n.total_carbs_g || 0),
      0
    );
    const totalFat = (nutritionLogs || []).reduce(
      (sum: number, n: any) => sum + (n.total_fat_g || 0),
      0
    );

    // Sleep stats
    const { data: sleepLogs } = await (supabase
      .from('sleep_logs')
      .select('date, hours_slept, quality_rating')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false }) as any);

    const avgHoursSlept =
      (sleepLogs || []).length > 0
        ? (sleepLogs || []).reduce((sum: number, s: any) => sum + (s.hours_slept || 0), 0) /
          (sleepLogs || []).length
        : 0;

    const avgQualityRating =
      (sleepLogs || []).filter((s: any) => s.quality_rating !== null).length > 0
        ? (sleepLogs || []).reduce(
            (sum: number, s: any) => sum + (s.quality_rating || 0),
            0
          ) / (sleepLogs || []).filter((s: any) => s.quality_rating !== null).length
        : null;

    return NextResponse.json({
      period,
      date_range: { start, end },
      workouts: {
        total: totalWorkouts,
        total_duration_minutes: totalDuration,
        total_xp_earned: totalXpFromWorkouts,
        avg_duration_minutes: totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0,
        category_breakdown: categoryBreakdown,
      },
      nutrition: {
        total_logs: (nutritionLogs || []).length,
        total_calories: totalCalories,
        total_protein_g: totalProtein,
        total_carbs_g: totalCarbs,
        total_fat_g: totalFat,
        avg_daily_calories:
          (nutritionLogs || []).length > 0
            ? Math.round(totalCalories / (nutritionLogs || []).length)
            : 0,
      },
      sleep: {
        total_logs: (sleepLogs || []).length,
        avg_hours_slept: Math.round(avgHoursSlept * 10) / 10,
        avg_quality_rating: avgQualityRating !== null ? Math.round(avgQualityRating * 10) / 10 : null,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
