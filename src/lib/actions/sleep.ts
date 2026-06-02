// Forge Fit — Sleep Server Actions
'use server';

import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import {
  createSleepSchema,
  updateSleepSchema,
  calculateSleepXp,
  calculateLevel,
} from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: { path: string; message: string }[] };

/**
 * Create a new sleep log entry with XP reward.
 */
export async function createSleepLog(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    const raw = Object.fromEntries(formData.entries());
    const parsed = createSleepSchema.safeParse({
      ...raw,
      hours_slept: raw.hours_slept ? Number(raw.hours_slept) : undefined,
      quality_rating: raw.quality_rating ? Number(raw.quality_rating) : undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }

    const { data: log, error } = await sb
      .from('sleep_logs')
      .insert({
        user_id: user.id,
        date: parsed.data.date,
        bedtime: parsed.data.bedtime,
        wake_time: parsed.data.wake_time,
        hours_slept: parsed.data.hours_slept,
        quality_rating: parsed.data.quality_rating ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Award XP for logging sleep
    const xpEarned = calculateSleepXp(parsed.data.hours_slept);

    const { data: userData } = await sb
      .from('users')
      .select('xp, level')
      .eq('id', user.id)
      .single();

    const newXp = (userData?.xp ?? 0) + xpEarned;
    const newLevel = calculateLevel(newXp);

    await sb
      .from('users')
      .update({ xp: newXp, level: newLevel })
      .eq('id', user.id);

    // Update sleep streak
    await sb.rpc('increment_streak', {
      p_user_id: user.id,
      p_streak_type: 'sleep',
      p_activity_date: parsed.data.date,
    });

    revalidatePath('/sleep');
    return { success: true, data: { log, xp_earned: xpEarned } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Create sleep log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update an existing sleep log entry.
 */
export async function updateSleepLog(
  logId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    const raw = Object.fromEntries(formData.entries());
    const parsed = updateSleepSchema.safeParse({
      ...raw,
      hours_slept: raw.hours_slept ? Number(raw.hours_slept) : undefined,
      quality_rating: raw.quality_rating ? Number(raw.quality_rating) : undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }

    const { data: log, error } = await sb
      .from('sleep_logs')
      .update(parsed.data)
      .eq('id', logId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/sleep');
    return { success: true, data: { log } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Update sleep log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete a sleep log entry.
 */
export async function deleteSleepLog(
  logId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/sleep');
    return { success: true, data: { message: 'Sleep log deleted' } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Delete sleep log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
