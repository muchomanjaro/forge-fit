// Forge Fit — Nutrition Server Actions
'use server';

import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import {
  createNutritionSchema,
  updateNutritionSchema,
  calculateNutritionXp,
  calculateLevel,
} from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: { path: string; message: string }[] };

/**
 * Create a new nutrition log entry with XP reward.
 */
export async function createNutritionLog(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    const raw = Object.fromEntries(formData.entries());
    const parsed = createNutritionSchema.safeParse({
      ...raw,
      meal_type: raw.meal_type,
      total_calories: raw.total_calories ? Number(raw.total_calories) : undefined,
      total_protein_g: raw.total_protein_g ? Number(raw.total_protein_g) : undefined,
      total_carbs_g: raw.total_carbs_g ? Number(raw.total_carbs_g) : undefined,
      total_fat_g: raw.total_fat_g ? Number(raw.total_fat_g) : undefined,
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
      .from('nutrition_logs')
      .insert({
        user_id: user.id,
        meal_type: parsed.data.meal_type,
        logged_at: parsed.data.logged_at ?? new Date().toISOString(),
        notes: parsed.data.notes ?? null,
        total_calories: parsed.data.total_calories,
        total_protein_g: parsed.data.total_protein_g,
        total_carbs_g: parsed.data.total_carbs_g,
        total_fat_g: parsed.data.total_fat_g,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Award XP for logging nutrition
    const xpEarned = calculateNutritionXp(
      parsed.data.total_calories,
      parsed.data.total_protein_g
    );

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

    // Update nutrition streak
    const today = new Date().toISOString().split('T')[0];
    await sb.rpc('increment_streak', {
      p_user_id: user.id,
      p_streak_type: 'nutrition',
      p_activity_date: today,
    });

    revalidatePath('/nutrition');
    return { success: true, data: { log, xp_earned: xpEarned } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Create nutrition log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update an existing nutrition log entry.
 */
export async function updateNutritionLog(
  logId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();
    const sb = supabase as any;

    const raw = Object.fromEntries(formData.entries());
    const parsed = updateNutritionSchema.safeParse({
      ...raw,
      total_calories: raw.total_calories ? Number(raw.total_calories) : undefined,
      total_protein_g: raw.total_protein_g ? Number(raw.total_protein_g) : undefined,
      total_carbs_g: raw.total_carbs_g ? Number(raw.total_carbs_g) : undefined,
      total_fat_g: raw.total_fat_g ? Number(raw.total_fat_g) : undefined,
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
      .from('nutrition_logs')
      .update(parsed.data)
      .eq('id', logId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/nutrition');
    return { success: true, data: { log } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Update nutrition log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete a nutrition log entry.
 */
export async function deleteNutritionLog(
  logId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from('nutrition_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/nutrition');
    return { success: true, data: { message: 'Nutrition log deleted' } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Delete nutrition log action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
