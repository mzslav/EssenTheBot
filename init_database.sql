CREATE TABLE IF NOT EXISTS users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  telegram_user_id bigint UNIQUE NOT NULL,
  first_name text NOT NULL,
  username text,
  gender text,
  age int,
  weight numeric,
  height numeric,
  goal text,
  activity text,
  multiplier numeric DEFAULT 1.2,
  notification boolean DEFAULT false,
  notify_water boolean DEFAULT false,
  notify_meals boolean DEFAULT false,
  streak_days int DEFAULT 0,
  "TDEE_Normal" numeric,
  "TDEE" numeric,
  "protein_Normal" numeric,
  protein numeric,
  "fat_Normal" numeric,
  fat numeric,
  "carbs_Normal" numeric,
  carbs numeric,
  "waterPerDay" numeric,
  "BMI" numeric,
  "BMICategory" text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  water_ml int DEFAULT 0,
  tdee_at_time numeric,
  protein_target numeric,
  fat_target numeric,
  carbs_target numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS meals (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  daily_log_id bigint REFERENCES daily_logs(id) ON DELETE CASCADE,
  name text NOT NULL,
  calories int NOT NULL,
  protein numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  emoji text,
  type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  weight numeric NOT NULL,
  date date DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS favorite_meals (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  calories int NOT NULL,
  protein numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  emoji text,
  use_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  plan_id bigint REFERENCES workout_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  video_url text,
  sets int DEFAULT 1,
  reps text,
  weight numeric,
  rir text,
  notes text,
  order_index int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  plan_id bigint REFERENCES workout_plans(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL,
  status text DEFAULT 'planned', 
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id bigint REFERENCES workout_sessions(id) ON DELETE CASCADE,
  plan_exercise_id bigint REFERENCES plan_exercises(id) ON DELETE SET NULL,
  name text NOT NULL,
  video_url text,
  notes text,
  order_index int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS session_sets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_exercise_id bigint REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number int NOT NULL,
  reps int,
  weight numeric,
  rir int,
  is_completed boolean DEFAULT false
);

CREATE OR REPLACE FUNCTION get_or_create_day_id(p_user_id bigint, p_date date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_id bigint;
  v_user RECORD;
BEGIN
  SELECT id INTO v_day_id FROM daily_logs WHERE user_id = p_user_id AND date = p_date;
  
  IF v_day_id IS NULL THEN
    SELECT "TDEE", protein, fat, carbs INTO v_user FROM users WHERE id = p_user_id;
    
    INSERT INTO daily_logs (user_id, date, tdee_at_time, protein_target, fat_target, carbs_target)
    VALUES (p_user_id, p_date, v_user."TDEE", v_user.protein, v_user.fat, v_user.carbs)
    RETURNING id INTO v_day_id;
  END IF;
  
  RETURN v_day_id;
END;
$$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all daily_logs" ON daily_logs FOR ALL USING (true);
CREATE POLICY "Allow all meals" ON meals FOR ALL USING (true);
CREATE POLICY "Allow all weight_logs" ON weight_logs FOR ALL USING (true);
CREATE POLICY "Allow all favorite_meals" ON favorite_meals FOR ALL USING (true);
CREATE POLICY "Allow all workout_plans" ON workout_plans FOR ALL USING (true);
CREATE POLICY "Allow all plan_exercises" ON plan_exercises FOR ALL USING (true);
CREATE POLICY "Allow all workout_sessions" ON workout_sessions FOR ALL USING (true);
CREATE POLICY "Allow all session_exercises" ON session_exercises FOR ALL USING (true);
CREATE POLICY "Allow all session_sets" ON session_sets FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_daily_log ON meals(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_favorite_meals_user ON favorite_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date);
