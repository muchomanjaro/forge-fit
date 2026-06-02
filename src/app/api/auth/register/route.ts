import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, display_name } = await request.json();

    // Validation
    if (!email || !password || !display_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, display_name' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (typeof display_name !== 'string' || display_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    const supabase = await createRouteClient();

    // Sign up with Supabase Auth
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

    // Create user profile record
    const { error: profileError } = await supabase.from('user_profiles').insert({
      user_id: authData.user.id,
    } as any);

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Create default user stats record
    const { error: statsError } = await supabase.from('user_stats').insert({
      user_id: authData.user.id,
      date: new Date().toISOString().split('T')[0],
    } as any);

    if (statsError) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
