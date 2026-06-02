-- Forge Fit — Schema Foundation
-- Migration 00001: Core tables, indexes, and Row-Level Security

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url  TEXT,
  xp          INTEGER NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_xp ON users (xp DESC);

-- 2.2 user_profiles
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age         INTEGER CHECK (age >= 0 AND age <= 150),
  gender      VARCHAR(20),
  fitness_level VARCHAR(20) CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  weight_kg   DECIMAL(5,1),
  height_cm   DECIMAL(5,1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 2.3 user_goals
CREATE TABLE user_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type   VARCHAR(20) NOT NULL CHECK (goal_type IN ('weight_loss', 'muscle', 'endurance', 'flexibility', 'wellness', 'longevity')),
  priority    INTEGER NOT NULL DEFAULT 0,
  target_value DECIMAL(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_goals_user ON user_goals (user_id);

-- 2.4 workouts
CREATE TABLE workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(20) NOT NULL CHECK (category IN ('cardio', 'strength', 'flexibility')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  xp_earned       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workouts_user_date ON workouts (user_id, completed_at DESC);
CREATE INDEX idx_workouts_category ON workouts (user_id, category);

-- 2.5 workout_exercises
CREATE TABLE workout_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name   VARCHAR(255) NOT NULL,
  sets            INTEGER CHECK (sets > 0),
  reps            INTEGER CHECK (reps > 0),
  weight_kg       DECIMAL(6,2),
  rpe             INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id);

-- 2.6 nutrition_logs
CREATE TABLE nutrition_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type       VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  total_calories  INTEGER NOT NULL DEFAULT 0,
  total_protein_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  total_carbs_g   DECIMAL(6,1) NOT NULL DEFAULT 0,
  total_fat_g     DECIMAL(6,1) NOT NULL DEFAULT 0
);

CREATE INDEX idx_nutrition_user_date ON nutrition_logs (user_id, logged_at DESC);

-- 2.7 sleep_logs
CREATE TABLE sleep_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  bedtime         TIMESTAMPTZ NOT NULL,
  wake_time       TIMESTAMPTZ NOT NULL,
  hours_slept     DECIMAL(4,1) NOT NULL CHECK (hours_slept > 0 AND hours_slept <= 24),
  quality_rating  INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_sleep_date UNIQUE (user_id, date)
);

CREATE INDEX idx_sleep_user_date ON sleep_logs (user_id, date DESC);

-- 2.8 achievements
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  icon            VARCHAR(100),
  xp_reward       INTEGER NOT NULL DEFAULT 0,
  criteria_type   VARCHAR(50) NOT NULL,
  criteria_value  JSONB NOT NULL DEFAULT '{}'
);

-- 2.9 user_achievements
CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements (user_id);

-- 2.10 streaks
CREATE TABLE streaks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type       VARCHAR(20) NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'sleep')),
  current_count     INTEGER NOT NULL DEFAULT 0,
  longest_count     INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, streak_type)
);

CREATE INDEX idx_streaks_user ON streaks (user_id);

-- 2.11 user_stats
CREATE TABLE user_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       DECIMAL(5,1),
  body_fat_pct    DECIMAL(4,1),
  notes           TEXT,
  UNIQUE (user_id, date)
);

CREATE INDEX idx_user_stats_user_date ON user_stats (user_id, date DESC);

-- ============================================================
-- 3. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- 3.1 Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- 3.2 Helper: authenticated user owns the row
-- All policies use auth.uid() which is the user's UUID from Supabase Auth

-- users: user can read/update their own record only
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- user_profiles: user can manage their own profile
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- user_goals: user can manage their own goals
CREATE POLICY "goals_select_own" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON user_goals
  FOR DELETE USING (auth.uid() = user_id);

-- workouts: user can manage their own workouts
CREATE POLICY "workouts_select_own" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workouts_insert_own" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_update_own" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workouts_delete_own" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- workout_exercises: user can manage exercises on their workouts
CREATE POLICY "exercises_select_own" ON workout_exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "exercises_insert_own" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "exercises_update_own" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

CREATE POLICY "exercises_delete_own" ON workout_exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid())
  );

-- nutrition_logs: user can manage their own logs
CREATE POLICY "nutrition_select_own" ON nutrition_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "nutrition_insert_own" ON nutrition_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "nutrition_update_own" ON nutrition_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "nutrition_delete_own" ON nutrition_logs
  FOR DELETE USING (auth.uid() = user_id);

-- sleep_logs: user can manage their own logs
CREATE POLICY "sleep_select_own" ON sleep_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sleep_insert_own" ON sleep_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sleep_update_own" ON sleep_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sleep_delete_own" ON sleep_logs
  FOR DELETE USING (auth.uid() = user_id);

-- achievements: anyone authenticated can read (reference data)
CREATE POLICY "achievements_select_all" ON achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- user_achievements: user can read own, system inserts/unlocks
CREATE POLICY "user_achievements_select_own" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- streaks: user can read own, system updates
CREATE POLICY "streaks_select_own" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "streaks_insert_own" ON streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streaks_update_own" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- user_stats: user can manage their own stats
CREATE POLICY "stats_select_own" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stats_insert_own" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stats_update_own" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "stats_delete_own" ON user_stats
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. AUTOMATED UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
