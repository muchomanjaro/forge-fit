-- Forge Fit — Add Missing Timestamps
-- Migration 00004: Add created_at columns to tables missing them for consistency
--
-- Adds:
--   1. created_at to workout_exercises
--   2. created_at to achievements  
--   3. created_at to user_stats
--   4. updated_at trigger on user_stats (for future-proofing)

-- ============================================================
-- 1. workout_exercises — Add created_at
-- ============================================================
ALTER TABLE workout_exercises
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_workout_exercises_created
  ON workout_exercises (workout_id, created_at DESC);

-- ============================================================
-- 2. achievements — Add created_at (reference data tracking)
-- ============================================================
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_achievements_created
  ON achievements (created_at DESC);

-- ============================================================
-- 3. user_stats — Add created_at and updated_at
-- ============================================================
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_stats_created
  ON user_stats (user_id, created_at DESC);

-- Add updated_at trigger for user_stats
CREATE TRIGGER set_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. Update RLS policies for user_stats (new columns are auto-covered)
--    No policy changes needed — existing policies reference user_id only.
-- ============================================================

-- ============================================================
-- 5. Update user_daily_summary view — keep in sync
-- ============================================================
-- The view already uses user_stats(date) references, no column changes needed.
-- Dropping and recreating to refresh dependency tracking.
DROP VIEW IF EXISTS user_daily_summary;

CREATE VIEW user_daily_summary AS
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
