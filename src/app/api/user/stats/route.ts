import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import {
  createUserStatSchema,
  updateUserStatSchema,
} from '@/lib/validation';
import { validationError, authError, serverError } from '@/lib/errors';

// GET /api/user/stats — List user stats (weight tracking) with date filtering
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const offset = Number(searchParams.get('offset')) || 0;

    let query = supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    const date = searchParams.get('date');
    if (date) {
      query = query.eq('date', date);
    }

    const fromDate = searchParams.get('from');
    if (fromDate) {
      query = query.gte('date', fromDate);
    }

    const toDate = searchParams.get('to');
    if (toDate) {
      query = query.lte('date', toDate);
    }

    const { data: stats, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Get user stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/user/stats — Create a user stat entry (weight, body fat)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const parsed = createUserStatSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { data: stat, error } = await ((supabase as any)
      .from('user_stats')
      .insert({
        user_id: user.id,
        date: parsed.data.date,
        weight_kg: parsed.data.weight_kg ?? null,
        body_fat_pct: parsed.data.body_fat_pct ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single());

    if (error) {
      // Check for duplicate date
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A stat entry already exists for this date' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stat }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Create user stat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/stats — Update a user stat entry
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const body = await request.json();

    const statId = request.nextUrl.searchParams.get('id');
    if (!statId) {
      return NextResponse.json(
        { error: 'Missing stat id query parameter' },
        { status: 400 }
      );
    }

    const parsed = updateUserStatSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: stat, error } = await ((supabase as any)
      .from('user_stats')
      .update(parsed.data)
      .eq('id', statId)
      .eq('user_id', user.id)
      .select()
      .single());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stat });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Update user stat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/user/stats — Delete a user stat entry
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const statId = request.nextUrl.searchParams.get('id');
    if (!statId) {
      return NextResponse.json(
        { error: 'Missing stat id query parameter' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_stats')
      .delete()
      .eq('id', statId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Stat entry deleted successfully' });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ error: error.error }, { status: 401 });
    }
    console.error('Delete user stat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
