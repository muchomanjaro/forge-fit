-- Forge Fit — Schema Enhancements
-- Migration 00003: workout_types, meal_items, xp_transactions, refresh_tokens + views + seed data
--
-- Adds:
--   1. workout_types      — Normalised lookup table (per design proposal)
--   2. meal_items         — Individual food items within a nutrition log
--   3. xp_transactions    — Audit trail for all XP changes (gamification backbone)
--   4. refresh_tokens     — JWT refresh token rotation
--   5. daily_summary view — Aggregated daily stats for dashboards
--   6. Additional indexes  — Cover common query patterns
--   7. Seed data          — Workout types + starter achievements
--   8. RLS policies        — For new tables

-- ============================================================
-- 1. workout_types — Normalised workout type reference table
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  category        VARCHAR(50) NOT NULL CHECK (category IN ('cardio', 'strength', 'flexibility')),
  base_xp         INTEGER NOT NULL DEFAULT 10,
  icon            VARCHAR(50),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_types_name ON workout_types (name);

-- Add optional FK from workouts to workout_types (nullable for backwards compatibility)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS workout_type_id UUID REFERENCES workout_types(id) ON DELETE SET NULL;

-- ============================================================
-- 2. meal_items — Individual food items within a nutrition log
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_log_id  UUID NOT NULL REFERENCES nutrition_logs(id) ON DELETE CASCADE,
  food_name         VARCHAR(255) NOT NULL,
  serving_size      VARCHAR(100),
  calories          INTEGER NOT NULL DEFAULT 0,
  protein_g         DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g           DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g             DECIMAL(6,1) NOT NULL DEFAULT 0,
  fiber_g           DECIMAL(6,1) DEFAULT 0,
  sugar_g           DECIMAL(6,1) DEFAULT 0,
  sodium_mg         INTEGER DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_nutrition_log ON meal_items (nutrition_log_id);

-- ============================================================
-- 3. xp_transactions — Immutable audit trail for XP changes
-- ============================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          INTEGER NOT NULL,
  source          VARCHAR(50) NOT NULL CHECK (source IN (
                    'workout', 'nutrition', 'sleep', 'achievement', 'streak_bonus', 'admin', 'other'
                  )),
  source_id       UUID,            -- FK to the originating record (workout, achievement, etc.)
  description     TEXT,
  balance_before  INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions (source, source_id);

-- ============================================================
-- 4. refresh_tokens — JWT refresh token rotation
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at) WHERE revoked = FALSE;

-- ============================================================
-- 5. Additional indexes for performance
-- ============================================================

-- workout_exercises: query by exercise_name
CREATE INDEX IF NOT EXISTS idx_workout_exercises_name ON workout_exercises (exercise_name);

-- nutrition_logs: date-based queries (stats page does gte/lte on logged_at)
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON nutrition_logs (user_id, logged_at);

-- user_stats: already indexed, add body_fat lookup
CREATE INDEX IF NOT EXISTS idx_user_stats_body_fat ON user_stats (user_id, body_fat_pct) WHERE body_fat_pct IS NOT NULL;

-- achievements: query by criteria_type (gamification engine)
CREATE INDEX IF NOT EXISTS idx_achievements_criteria ON achievements (criteria_type);

-- user_achievements: find by achievement_id for unlock checks
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements (achievement_id);

-- sleep_logs: quality rating queries
CREATE INDEX IF NOT EXISTS idx_sleep_logs_quality ON sleep_logs (user_id, quality_rating) WHERE quality_rating IS NOT NULL;

-- ============================================================
-- 6. Daily summary view — Aggregated stats per day per user
-- ============================================================
CREATE OR REPLACE VIEW user_daily_summary AS
SELECT
  u.id AS user_id,
  d.date,
  COALESCE(wk.workout_count, 0) AS workout_count,
  COALESCE(wk.total_duration, 0) AS total_workout_minutes,
  COALESCE(wk.total_xp, 0) AS workout_xp,
  COALESCE(nl.meal_count, 0) AS meal_count,
  COALESCE(nl.total_calories, 0) AS total_calories,
  COALESCE(nl.total_protein, 0) AS total_protein_g,
  COALESCE(nl.total_carbs, 0) AS total_carbs_g,
  COALESCE(nl.total_fat, 0) AS total_fat_g,
  sl.hours_slept,
  sl.quality_rating,
  COALESCE(ua.achievements_unlocked, 0) AS achievements_unlocked,
  COALESCE(xt.total_xp_earned, 0) AS total_xp_earned
FROM users u
CROSS JOIN LATERAL (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    '1 day'::interval
  )::date AS date
) d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS workout_count,
    COALESCE(SUM(duration_minutes), 0) AS total_duration,
    COALESCE(SUM(xp_earned), 0) AS total_xp
  FROM workouts
  WHERE user_id = u.id
    AND completed_at::date = d.date
) wk ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS meal_count,
    COALESCE(SUM(total_calories), 0) AS total_calories,
    COALESCE(SUM(total_protein_g), 0) AS total_protein,
    COALESCE(SUM(total_carbs_g), 0) AS total_carbs,
    COALESCE(SUM(total_fat_g), 0) AS total_fat
  FROM nutrition_logs
  WHERE user_id = u.id
    AND logged_at::date = d.date
) nl ON TRUE
LEFT JOIN LATERAL (
  SELECT hours_slept, quality_rating
  FROM sleep_logs
  WHERE user_id = u.id AND date = d.date
  LIMIT 1
) sl ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS achievements_unlocked
  FROM user_achievements
  WHERE user_id = u.id AND unlocked_at::date = d.date
) ua ON TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total_xp_earned
  FROM xp_transactions
  WHERE user_id = u.id AND created_at::date = d.date
) xt ON TRUE
WHERE d.date <= CURRENT_DATE;

-- ============================================================
-- 7. Function: award_xp — Atomically award XP and log transaction
-- ============================================================
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id       UUID,
  p_amount        INTEGER,
  p_source        VARCHAR(50),
  p_source_id     UUID DEFAULT NULL,
  p_description   TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_old_xp    INTEGER;
  v_new_xp    INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Lock the user row to prevent race conditions
  SELECT xp INTO v_old_xp
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  v_new_xp := v_old_xp + p_amount;

  -- Update user XP and recalculate level
  v_new_level := GREATEST(1, FLOOR(SQRT(v_new_xp / 100.0)) + 1);

  UPDATE users
  SET xp = v_new_xp,
      level = v_new_level,
      updated_at = now()
  WHERE id = p_user_id;

  -- Write audit trail
  INSERT INTO xp_transactions (user_id, amount, source, source_id, description, balance_before, balance_after)
  VALUES (p_user_id, p_amount, p_source, p_source_id, p_description, v_old_xp, v_new_xp);

  RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================================

-- workout_types: read-only reference data for authenticated users
ALTER TABLE IF EXISTS workout_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_types_select_all" ON workout_types;
CREATE POLICY "workout_types_select_all" ON workout_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- meal_items: user can manage items on their own nutrition logs
ALTER TABLE IF EXISTS meal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_items_select_own" ON meal_items;
CREATE POLICY "meal_items_select_own" ON meal_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM nutrition_logs WHERE nutrition_logs.id = meal_items.nutrition_log_id AND nutrition_logs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "meal_items_insert_own" ON meal_items;
CREATE POLICY "meal_items_insert_own" ON meal_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM nutrition_logs WHERE nutrition_logs.id = meal_items.nutrition_log_id AND nutrition_logs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "meal_items_update_own" ON meal_items;
CREATE POLICY "meal_items_update_own" ON meal_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM nutrition_logs WHERE nutrition_logs.id = meal_items.nutrition_log_id AND nutrition_logs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "meal_items_delete_own" ON meal_items;
CREATE POLICY "meal_items_delete_own" ON meal_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM nutrition_logs WHERE nutrition_logs.id = meal_items.nutrition_log_id AND nutrition_logs.user_id = auth.uid())
  );

-- xp_transactions: user can read their own, only system inserts
ALTER TABLE IF EXISTS xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_transactions_select_own" ON xp_transactions;
CREATE POLICY "xp_transactions_select_own" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- refresh_tokens: user can manage their own tokens
ALTER TABLE IF EXISTS refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refresh_tokens_select_own" ON refresh_tokens;
CREATE POLICY "refresh_tokens_select_own" ON refresh_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "refresh_tokens_insert_own" ON refresh_tokens;
CREATE POLICY "refresh_tokens_insert_own" ON refresh_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "refresh_tokens_update_own" ON refresh_tokens;
CREATE POLICY "refresh_tokens_update_own" ON refresh_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "refresh_tokens_delete_own" ON refresh_tokens;
CREATE POLICY "refresh_tokens_delete_own" ON refresh_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 9. SEED DATA — workout_types
-- ============================================================
INSERT INTO workout_types (name, category, base_xp, icon) VALUES
  ('Running',       'cardio',      15, 'running'),
  ('Cycling',       'cardio',      12, 'cycling'),
  ('Swimming',      'cardio',      18, 'swimming'),
  ('Jump Rope',     'cardio',      14, 'jump-rope'),
  ('Walking',       'cardio',       8, 'walking'),
  ('HIIT',          'cardio',      20, 'hiit'),
  ('Push Ups',      'strength',    10, 'push-ups'),
  ('Pull Ups',      'strength',    12, 'pull-ups'),
  ('Squats',        'strength',    10, 'squats'),
  ('Deadlifts',     'strength',    15, 'deadlifts'),
  ('Bench Press',   'strength',    12, 'bench-press'),
  ('Dumbbell Row',  'strength',    10, 'dumbbell-row'),
  ('Overhead Press','strength',    11, 'overhead-press'),
  ('Yoga',          'flexibility',  8, 'yoga'),
  ('Stretching',    'flexibility',  5, 'stretching'),
  ('Pilates',       'flexibility',  9, 'pilates')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 10. SEED DATA — Starter achievements
-- ============================================================
INSERT INTO achievements (name, description, icon, xp_reward, criteria_type, criteria_value) VALUES
  ('First Steps',       'Complete your first workout',                      'footprints',    50,  'workout_count',    '{"count": 1}'::jsonb),
  ('Getting Started',   'Complete 5 workouts',                              'flame',         100,  'workout_count',    '{"count": 5}'::jsonb),
  ('Dedicated',         'Complete 25 workouts',                             'zap',           250,  'workout_count',    '{"count": 25}'::jsonb),
  ('Workout Warrior',   'Complete 100 workouts',                            'swords',        500,  'workout_count',    '{"count": 100}'::jsonb),
  ('Streak Starter',    'Maintain a 3-day streak',                          'link',           75,  'streak_days',      '{"type": "workout", "days": 3}'::jsonb),
  ('Week Warrior',      'Maintain a 7-day streak',                          'calendar',      150,  'streak_days',      '{"type": "workout", "days": 7}'::jsonb),
  ('Fortnight Fury',    'Maintain a 14-day streak',                         'calendar-check',300,  'streak_days',      '{"type": "workout", "days": 14}'::jsonb),
  ('Monthly Master',    'Maintain a 30-day streak',                         'crown',         500,  'streak_days',      '{"type": "workout", "days": 30}'::jsonb),
  ('Cardio King',       'Complete 10 cardio workouts',                      'heart',         150,  'category_count',   '{"category": "cardio", "count": 10}'::jsonb),
  ('Strength Stacker',  'Complete 10 strength workouts',                    'dumbbell',      150,  'category_count',   '{"category": "strength", "count": 10}'::jsonb),
  ('Flexibility Fan',   'Complete 10 flexibility workouts',                 'activity',      150,  'category_count',   '{"category": "flexibility", "count": 10}'::jsonb),
  ('Well Rounded',      'Complete workouts in all 3 categories',            'target',        200,  'all_categories',   '{}'::jsonb),
  ('Fuel Tracker',      'Log 10 nutrition entries',                         'utensils',      100,  'nutrition_count',  '{"count": 10}'::jsonb),
  ('Nutrition Guru',    'Log 50 nutrition entries',                         'apple',         300,  'nutrition_count',  '{"count": 50}'::jsonb),
  ('Sleep Tracker',     'Log 7 nights of sleep',                            'moon',          100,  'sleep_count',      '{"count": 7}'::jsonb),
  ('Sleep Champion',    'Log 30 nights of sleep',                           'bed',           300,  'sleep_count',      '{"count": 30}'::jsonb),
  ('Rising Star',       'Reach level 5',                                    'star',          200,  'level_reached',    '{"level": 5}'::jsonb),
  ('Fitness Fanatic',   'Reach level 10',                                   'award',         500,  'level_reached',    '{"level": 10}'::jsonb),
  ('Body Tracker',      'Log your first body stat',                         'scale',          50,  'stat_count',       '{"count": 1}'::jsonb),
  ('Consistency King',  'Log body stats for 30 days',                       'bar-chart',     400,  'stat_count',       '{"count": 30}'::jsonb)
ON CONFLICT (name) DO NOTHING;
