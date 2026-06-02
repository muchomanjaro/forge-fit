// Forge Fit — Zod Validation Schemas
import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or fewer')
    .trim(),
});

// ─── User Profile ──────────────────────────────────────

export const VALID_FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const VALID_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

export const profileUpdateSchema = z.object({
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(VALID_GENDERS).optional(),
  fitness_level: z.enum(VALID_FITNESS_LEVELS).optional(),
  weight_kg: z.number().positive().max(500).optional(),
  height_cm: z.number().positive().max(300).optional(),
});

// ─── Goals ──────────────────────────────────────────────

export const VALID_GOAL_TYPES = [
  'weight_loss',
  'muscle',
  'endurance',
  'flexibility',
  'wellness',
  'longevity',
] as const;

export const createGoalSchema = z.object({
  goal_type: z.enum(VALID_GOAL_TYPES),
  priority: z.number().int().positive().default(1),
  target_value: z.number().nullable().optional(),
});

export const updateGoalSchema = z.object({
  id: z.string().uuid('Goal id must be a valid UUID'),
  goal_type: z.enum(VALID_GOAL_TYPES).optional(),
  priority: z.number().int().positive().optional(),
  target_value: z.number().nullable().optional(),
});

// ─── Workouts ───────────────────────────────────────────

export const VALID_CATEGORIES = ['cardio', 'strength', 'flexibility'] as const;

export const createWorkoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required').max(200).trim(),
  category: z.enum(VALID_CATEGORIES),
  duration_minutes: z.number().nonnegative().default(0),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateWorkoutSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  duration_minutes: z.number().nonnegative().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listWorkoutsSchema = z.object({
  category: z.enum(VALID_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Workout Exercises ─────────────────────────────────

export const createExerciseSchema = z.object({
  exercise_name: z.string().min(1, 'Exercise name is required').max(200).trim(),
  sets: z.number().int().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  weight_kg: z.number().nonnegative().nullable().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Nutrition ──────────────────────────────────────────

export const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const createNutritionSchema = z.object({
  meal_type: z.enum(VALID_MEAL_TYPES),
  logged_at: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  total_calories: z.number().nonnegative().default(0),
  total_protein_g: z.number().nonnegative().default(0),
  total_carbs_g: z.number().nonnegative().default(0),
  total_fat_g: z.number().nonnegative().default(0),
});

export const updateNutritionSchema = z.object({
  meal_type: z.enum(VALID_MEAL_TYPES).optional(),
  logged_at: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  total_calories: z.number().nonnegative().optional(),
  total_protein_g: z.number().nonnegative().optional(),
  total_carbs_g: z.number().nonnegative().optional(),
  total_fat_g: z.number().nonnegative().optional(),
});

// ─── Sleep ──────────────────────────────────────────────

export const createSleepSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  bedtime: z.string().min(1, 'Bedtime is required'),
  wake_time: z.string().min(1, 'Wake time is required'),
  hours_slept: z.number().min(0).max(24).default(0),
  quality_rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateSleepSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bedtime: z.string().optional(),
  wake_time: z.string().optional(),
  hours_slept: z.number().min(0).max(24).optional(),
  quality_rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ─── User Stats (weight tracking) ──────────────────────

export const createUserStatSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  weight_kg: z.number().positive().max(500).nullable().optional(),
  body_fat_pct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateUserStatSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight_kg: z.number().positive().max(500).nullable().optional(),
  body_fat_pct: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ─── Meal Items ─────────────────────────────────────────

export const createMealItemSchema = z.object({
  food_name: z.string().min(1, 'Food name is required').max(200).trim(),
  serving_size: z.string().max(100).nullable().optional(),
  calories: z.number().nonnegative().default(0),
  protein_g: z.number().nonnegative().default(0),
  carbs_g: z.number().nonnegative().default(0),
  fat_g: z.number().nonnegative().default(0),
  fiber_g: z.number().nonnegative().nullable().optional(),
  sugar_g: z.number().nonnegative().nullable().optional(),
  sodium_mg: z.number().nonnegative().nullable().optional(),
});

export const updateMealItemSchema = z.object({
  food_name: z.string().min(1).max(200).trim().optional(),
  serving_size: z.string().max(100).nullable().optional(),
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fiber_g: z.number().nonnegative().nullable().optional(),
  sugar_g: z.number().nonnegative().nullable().optional(),
  sodium_mg: z.number().nonnegative().nullable().optional(),
});

// ─── Leaderboard ────────────────────────────────────────

export const VALID_LEADERBOARD_PERIODS = ['all', 'week', 'month'] as const;

export const leaderboardQuerySchema = z.object({
  period: z.enum(VALID_LEADERBOARD_PERIODS).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Stats Query ────────────────────────────────────────

export const VALID_STATS_PERIODS = ['week', 'month', '3months'] as const;

export const statsQuerySchema = z.object({
  period: z.enum(VALID_STATS_PERIODS).default('week'),
});

// ─── XP Calculation ─────────────────────────────────────

export function calculateWorkoutXp(
  durationMinutes: number,
  exerciseCount: number,
  avgRpe: number | null
): number {
  let xp = 10; // Base XP
  xp += exerciseCount * 2;
  xp += Math.round(durationMinutes * 0.5);

  if (avgRpe !== null && avgRpe > 0) {
    xp += Math.round(avgRpe * 1.5);
  }

  return Math.max(0, xp);
}

export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export function calculateNutritionXp(
  totalCalories: number,
  totalProtein: number
): number {
  let xp = 5; // Base XP for logging
  xp += Math.round(totalCalories / 100);
  xp += Math.round(totalProtein / 10);
  return Math.max(0, xp);
}

export function calculateSleepXp(hoursSlept: number): number {
  let xp = 5; // Base XP for logging
  if (hoursSlept >= 7 && hoursSlept <= 9) {
    xp += 10; // Optimal sleep bonus
  } else if (hoursSlept >= 6) {
    xp += 5; // Adequate sleep bonus
  }
  return Math.max(0, xp);
}
