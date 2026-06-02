-- Forge Fit — Fix Auth Schema References
-- Migration 00002: Fix foreign keys to reference auth.users (Supabase Auth)
--              : Add missing RLS insert policy for users table
--              : Add trigger to auto-create user profile on signup

-- ============================================================
-- 1. DROP OLD FK CONSTRAINTS pointing to custom users(id)
-- ============================================================
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_stats    DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
ALTER TABLE user_goals    DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;
ALTER TABLE workouts      DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;
ALTER TABLE nutrition_logs DROP CONSTRAINT IF EXISTS nutrition_logs_user_id_fkey;
ALTER TABLE sleep_logs    DROP CONSTRAINT IF EXISTS sleep_logs_user_id_fkey;
ALTER TABLE user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
ALTER TABLE streaks       DROP CONSTRAINT IF EXISTS streaks_user_id_fkey;

-- ============================================================
-- 2. RE-CREATE FKs pointing to auth.users (Supabase Auth)
-- ============================================================
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_stats
  ADD CONSTRAINT user_stats_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_goals
  ADD CONSTRAINT user_goals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE workouts
  ADD CONSTRAINT workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE nutrition_logs
  ADD CONSTRAINT nutrition_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sleep_logs
  ADD CONSTRAINT sleep_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE streaks
  ADD CONSTRAINT streaks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 3. ADD INSERT POLICY ON users TABLE
-- ============================================================
-- Allow a user to create their own record in the users table
-- (matching the Supabase Auth user id)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. CREATE TRIGGER: auto-create user row on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
