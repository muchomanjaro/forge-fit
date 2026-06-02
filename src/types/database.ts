// Forge Fit — Database Type Definitions
// Generated from schema migration 00001_forge_fit.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  age: number | null;
  gender: string | null;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  weight_kg: number | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: 'weight_loss' | 'muscle' | 'endurance' | 'flexibility' | 'wellness' | 'longevity';
  priority: number;
  target_value: number | null;
  created_at: string;
}

export type WorkoutCategory = 'cardio' | 'strength' | 'flexibility';

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  category: WorkoutCategory;
  duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  xp_earned: number;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
  notes: string | null;
  sort_order: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_type: MealType;
  logged_at: string;
  notes: string | null;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  hours_slept: number;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  criteria_type: string;
  criteria_value: Json;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string | null;
  created_at: string;
}

export type StreakType = 'workout' | 'nutrition' | 'sleep';

export interface Streak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_count: number;
  longest_count: number;
  last_activity_date: string | null;
  created_at: string;
}

export interface UserStat {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  notes: string | null;
}

// Database schema type map for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'xp' | 'level'> & { xp?: number; level?: number };
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at'>>;
      };
      user_goals: {
        Row: UserGoal;
        Insert: Omit<UserGoal, 'id' | 'created_at'>;
        Update: Partial<Omit<UserGoal, 'id' | 'user_id' | 'created_at'>>;
      };
      workouts: {
        Row: Workout;
        Insert: Omit<Workout, 'id' | 'created_at' | 'xp_earned'> & { xp_earned?: number };
        Update: Partial<Omit<Workout, 'id' | 'user_id' | 'created_at'>>;
      };
      workout_exercises: {
        Row: WorkoutExercise;
        Insert: Omit<WorkoutExercise, 'id'>;
        Update: Partial<Omit<WorkoutExercise, 'id' | 'workout_id'>>;
      };
      nutrition_logs: {
        Row: NutritionLog;
        Insert: Omit<NutritionLog, 'id'>;
        Update: Partial<Omit<NutritionLog, 'id' | 'user_id'>>;
      };
      sleep_logs: {
        Row: SleepLog;
        Insert: Omit<SleepLog, 'id' | 'created_at'>;
        Update: Partial<Omit<SleepLog, 'id' | 'user_id' | 'created_at'>>;
      };
      achievements: {
        Row: Achievement;
        Insert: Omit<Achievement, 'id'>;
        Update: Partial<Omit<Achievement, 'id'>>;
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: Omit<UserAchievement, 'id' | 'created_at'>;
        Update: Partial<Omit<UserAchievement, 'id' | 'user_id' | 'achievement_id' | 'created_at'>>;
      };
      streaks: {
        Row: Streak;
        Insert: Omit<Streak, 'id' | 'created_at'>;
        Update: Partial<Omit<Streak, 'id' | 'user_id' | 'streak_type' | 'created_at'>>;
      };
      user_stats: {
        Row: UserStat;
        Insert: Omit<UserStat, 'id'>;
        Update: Partial<Omit<UserStat, 'id' | 'user_id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
