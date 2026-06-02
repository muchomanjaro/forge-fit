import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { handleRouteError } from '@/lib/errors';

// GET /api/gamification/streaks — Get all streaks for the authenticated user
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { data: streaks, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      streaks: streaks || [],
      total_streaks: (streaks || []).length,
    });
  } catch (error) {
    return handleRouteError(error, 'streaks:list');
  }
}
