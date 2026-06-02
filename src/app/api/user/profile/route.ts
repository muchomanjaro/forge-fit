import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
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

    if (error) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json(
        { error: error.error },
        { status: 401 }
      );
    }
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile — Update the authenticated user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    // Validate allowed fields
    const allowedFields = ['age', 'gender', 'fitness_level', 'weight_kg', 'height_cm'];
    const updates: ProfileUpdate = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updates as any)[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (updates.age !== undefined && (typeof updates.age !== 'number' || updates.age < 0 || updates.age > 150)) {
      return NextResponse.json(
        { error: 'Age must be a number between 0 and 150' },
        { status: 400 }
      );
    }

    if (updates.weight_kg !== undefined && (typeof updates.weight_kg !== 'number' || updates.weight_kg <= 0 || updates.weight_kg > 500)) {
      return NextResponse.json(
        { error: 'Weight must be a number between 0 and 500 kg' },
        { status: 400 }
      );
    }

    if (updates.height_cm !== undefined && (typeof updates.height_cm !== 'number' || updates.height_cm <= 0 || updates.height_cm > 300)) {
      return NextResponse.json(
        { error: 'Height must be a number between 0 and 300 cm' },
        { status: 400 }
      );
    }

    if (updates.fitness_level !== undefined && !['beginner', 'intermediate', 'advanced'].includes(updates.fitness_level as string)) {
      return NextResponse.json(
        { error: 'Fitness level must be beginner, intermediate, or advanced' },
        { status: 400 }
      );
    }

    const { data: profile, error } = await ((supabase as any)
      .from('user_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single());

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json(
        { error: error.error },
        { status: 401 }
      );
    }
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
