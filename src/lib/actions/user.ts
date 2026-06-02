// Forge Fit — User Profile & Goals Server Actions
'use server';

import { createRouteClient, requireAuth } from '@/lib/supabase-server';
import {
  profileUpdateSchema,
  createGoalSchema,
  updateGoalSchema,
} from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: { path: string; message: string }[] };

/**
 * Update the authenticated user's profile.
 */
export async function updateProfile(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const raw = Object.fromEntries(formData.entries());
    const parsed = profileUpdateSchema.safeParse({
      ...raw,
      age: raw.age ? Number(raw.age) : undefined,
      weight_kg: raw.weight_kg ? Number(raw.weight_kg) : undefined,
      height_cm: raw.height_cm ? Number(raw.height_cm) : undefined,
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

    if (Object.keys(parsed.data).length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    const { data: profile, error } = await ((supabase as any)
      .from('user_profiles')
      .update(parsed.data)
      .eq('user_id', user.id)
      .select()
      .single());

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true, data: { profile } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Update profile action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Create a new user goal.
 */
export async function createGoal(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const raw = Object.fromEntries(formData.entries());
    const parsed = createGoalSchema.safeParse({
      ...raw,
      goal_type: raw.goal_type,
      priority: raw.priority ? Number(raw.priority) : undefined,
      target_value: raw.target_value ? Number(raw.target_value) : null,
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

    const { data: goal, error } = await ((supabase as any)
      .from('user_goals')
      .insert({
        user_id: user.id,
        goal_type: parsed.data.goal_type,
        priority: parsed.data.priority,
        target_value: parsed.data.target_value ?? null,
      })
      .select()
      .single());

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true, data: { goal } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Create goal action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete a user goal.
 */
export async function deleteGoal(
  goalId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createRouteClient();

    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true, data: { message: 'Goal deleted' } };
  } catch (error: any) {
    if (error?.status === 401) {
      return { success: false, error: 'Authentication required' };
    }
    console.error('Delete goal action error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
