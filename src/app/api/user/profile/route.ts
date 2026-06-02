import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import { profileUpdateSchema } from '@/lib/validation';
import { validationError, notFoundError, handleRouteError } from '@/lib/errors';
import type { Database } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

// GET /api/user/profile — Get the authenticated user's profile
export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      return notFoundError('Profile not found');
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return handleRouteError(error, 'profile:get');
  }
}

// PUT /api/user/profile — Update the authenticated user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(parsed.data as ProfileUpdate)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return handleRouteError(error, 'profile:update');
  }
}
