import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';
import { registerSchema } from '@/lib/validation';
import { validationError, serverError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { email, password, display_name } = parsed.data;
    const supabase = await createRouteClient();

    // Sign up with Supabase Auth
    // The database trigger on_auth_user_created automatically creates
    // users + user_profiles rows when the auth.users row is inserted.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    }

    // Create default user_stats record (not handled by trigger)
    const today = new Date().toISOString().split('T')[0];
    const { error: statsError } = await (supabase.from('user_stats').insert({
      user_id: authData.user.id,
      date: today,
    } as any);

    if (statsError) {
      // Non-fatal — the user is registered but stats row creation failed
      console.error('Stats creation error:', statsError);
    }

    return NextResponse.json(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          display_name,
        },
        session: authData.session,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return serverError(error, 'register');
  }
}
