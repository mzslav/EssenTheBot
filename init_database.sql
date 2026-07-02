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
  rest_timer_enabled boolean DEFAULT true,
  rest_timer_default_seconds int DEFAULT 90,
  rest_timer_adjust_seconds int DEFAULT 30,
  language text DEFAULT 'uk',
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

CREATE TABLE IF NOT EXISTS exercise_library (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  video_url text,
  notes text,
  is_favorite boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  plan_id bigint REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercise_library(id) ON DELETE SET NULL,
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
  exercise_id bigint REFERENCES exercise_library(id) ON DELETE SET NULL,
  name text NOT NULL,
  video_url text,
  notes text,
  order_index int DEFAULT 0,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped', 'replaced')),
  replaced_by_session_exercise_id bigint REFERENCES session_exercises(id) ON DELETE SET NULL
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

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text DEFAULT 'profile',
  source_ref text,
  source_hash text,
  source_version int NOT NULL DEFAULT 1,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  user_id bigint REFERENCES users(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  content_hash text,
  token_count int,
  embedding halfvec(4000) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS source_hash text,
  ADD COLUMN IF NOT EXISTS source_version int NOT NULL DEFAULT 1;

ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS content_hash text;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key text PRIMARY KEY,
  request_count int NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  p_user_id bigint,
  p_query_embedding halfvec(4000),
  p_match_count int DEFAULT 8,
  p_match_threshold double precision DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  user_id bigint,
  chunk_index int,
  document_title text,
  source_type text,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.user_id,
    kc.chunk_index,
    kd.title AS document_title,
    kd.source_type,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> p_query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd
    ON kd.id = kc.document_id
  WHERE kc.user_id = p_user_id
    AND COALESCE((kd.metadata ->> 'synthetic')::boolean, false) = false
    AND 1 - (kc.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY kc.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

REVOKE ALL ON FUNCTION match_knowledge_chunks(bigint, halfvec(4000), int, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge_chunks(bigint, halfvec(4000), int, double precision) TO service_role;

CREATE OR REPLACE FUNCTION upsert_knowledge_snapshot(
  p_user_id bigint,
  p_title text,
  p_source_type text,
  p_source_ref text,
  p_content text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_source_hash text DEFAULT NULL,
  p_chunks jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (saved_document_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document_id uuid;
  v_existing_source_hash text;
  v_chunk jsonb;
BEGIN
  IF p_source_ref IS NULL OR btrim(p_source_ref) = '' THEN
    RAISE EXCEPTION 'source_ref is required for snapshot upsert';
  END IF;

  SELECT id, source_hash
  INTO v_document_id, v_existing_source_hash
  FROM knowledge_documents
  WHERE user_id = p_user_id
    AND source_type = p_source_type
    AND source_ref = p_source_ref
  FOR UPDATE;

  IF v_document_id IS NULL THEN
    INSERT INTO knowledge_documents (
      user_id,
      title,
      source_type,
      source_ref,
      source_hash,
      source_version,
      content,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_title,
      p_source_type,
      p_source_ref,
      p_source_hash,
      1,
      p_content,
      COALESCE(p_metadata, '{}'::jsonb),
      now(),
      now()
    )
    RETURNING id INTO v_document_id;
  ELSE
    UPDATE knowledge_documents
    SET
      title = p_title,
      content = p_content,
      metadata = COALESCE(p_metadata, '{}'::jsonb),
      source_hash = p_source_hash,
      source_version = CASE
        WHEN v_existing_source_hash IS DISTINCT FROM p_source_hash THEN COALESCE(source_version, 1) + 1
        ELSE COALESCE(source_version, 1)
      END,
      updated_at = now()
    WHERE id = v_document_id;
  END IF;

  DELETE FROM knowledge_chunks kc
  WHERE kc.document_id = v_document_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_chunks) AS chunk
      WHERE (chunk ->> 'chunkIndex')::int = kc.chunk_index
    );

  FOR v_chunk IN
    SELECT value
    FROM jsonb_array_elements(p_chunks)
  LOOP
    INSERT INTO knowledge_chunks (
      document_id,
      user_id,
      chunk_index,
      content,
      content_hash,
      token_count,
      embedding,
      metadata,
      created_at
    )
    VALUES (
      v_document_id,
      p_user_id,
      (v_chunk ->> 'chunkIndex')::int,
      v_chunk ->> 'content',
      NULLIF(v_chunk ->> 'contentHash', ''),
      NULLIF(v_chunk ->> 'tokenCount', '')::int,
      (v_chunk ->> 'embedding')::halfvec(4000),
      COALESCE(v_chunk -> 'metadata', '{}'::jsonb),
      now()
    )
    ON CONFLICT (document_id, chunk_index) DO UPDATE
    SET
      content = EXCLUDED.content,
      content_hash = EXCLUDED.content_hash,
      token_count = EXCLUDED.token_count,
      embedding = EXCLUDED.embedding,
      metadata = EXCLUDED.metadata;
  END LOOP;

  RETURN QUERY SELECT v_document_id AS saved_document_id;
END;
$$;

REVOKE ALL ON FUNCTION upsert_knowledge_snapshot(bigint, text, text, text, text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_knowledge_snapshot(bigint, text, text, text, text, jsonb, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION consume_api_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
RETURNS TABLE (
  allowed boolean,
  remaining int,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
BEGIN
  INSERT INTO api_rate_limits AS rl (key, request_count, window_started_at, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    request_count = CASE
      WHEN rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) THEN 1
      ELSE rl.request_count + 1
    END,
    window_started_at = CASE
      WHEN rl.window_started_at <= v_now - make_interval(secs => p_window_seconds) THEN v_now
      ELSE rl.window_started_at
    END,
    updated_at = v_now
  RETURNING request_count, window_started_at
  INTO v_count, v_window_start;

  RETURN QUERY
  SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
END;
$$;

REVOKE ALL ON FUNCTION consume_api_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_api_rate_limit(text, int, int) TO service_role;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users" ON users;
DROP POLICY IF EXISTS "Allow all daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "Allow all meals" ON meals;
DROP POLICY IF EXISTS "Allow all weight_logs" ON weight_logs;
DROP POLICY IF EXISTS "Allow all favorite_meals" ON favorite_meals;
DROP POLICY IF EXISTS "Allow all workout_plans" ON workout_plans;
DROP POLICY IF EXISTS "Allow all exercise_library" ON exercise_library;
DROP POLICY IF EXISTS "Allow all plan_exercises" ON plan_exercises;
DROP POLICY IF EXISTS "Allow all workout_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Allow all session_exercises" ON session_exercises;
DROP POLICY IF EXISTS "Allow all session_sets" ON session_sets;
DROP POLICY IF EXISTS "Allow all knowledge_documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Allow all knowledge_chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "Allow all api_rate_limits" ON api_rate_limits;
DROP POLICY IF EXISTS knowledge_documents_service_role_only ON knowledge_documents;
DROP POLICY IF EXISTS knowledge_chunks_service_role_only ON knowledge_chunks;
DROP POLICY IF EXISTS api_rate_limits_service_role_only ON api_rate_limits;

DROP POLICY IF EXISTS users_select_legacy ON users;
DROP POLICY IF EXISTS users_insert_legacy ON users;
DROP POLICY IF EXISTS users_update_legacy ON users;
DROP POLICY IF EXISTS users_delete_legacy ON users;
DROP POLICY IF EXISTS daily_logs_select_legacy ON daily_logs;
DROP POLICY IF EXISTS daily_logs_insert_legacy ON daily_logs;
DROP POLICY IF EXISTS daily_logs_update_legacy ON daily_logs;
DROP POLICY IF EXISTS daily_logs_delete_legacy ON daily_logs;
DROP POLICY IF EXISTS meals_select_legacy ON meals;
DROP POLICY IF EXISTS meals_insert_legacy ON meals;
DROP POLICY IF EXISTS meals_update_legacy ON meals;
DROP POLICY IF EXISTS meals_delete_legacy ON meals;
DROP POLICY IF EXISTS weight_logs_select_legacy ON weight_logs;
DROP POLICY IF EXISTS weight_logs_insert_legacy ON weight_logs;
DROP POLICY IF EXISTS weight_logs_update_legacy ON weight_logs;
DROP POLICY IF EXISTS weight_logs_delete_legacy ON weight_logs;
DROP POLICY IF EXISTS favorite_meals_select_legacy ON favorite_meals;
DROP POLICY IF EXISTS favorite_meals_insert_legacy ON favorite_meals;
DROP POLICY IF EXISTS favorite_meals_update_legacy ON favorite_meals;
DROP POLICY IF EXISTS favorite_meals_delete_legacy ON favorite_meals;
DROP POLICY IF EXISTS workout_plans_select_legacy ON workout_plans;
DROP POLICY IF EXISTS workout_plans_insert_legacy ON workout_plans;
DROP POLICY IF EXISTS workout_plans_update_legacy ON workout_plans;
DROP POLICY IF EXISTS workout_plans_delete_legacy ON workout_plans;
DROP POLICY IF EXISTS exercise_library_select_legacy ON exercise_library;
DROP POLICY IF EXISTS exercise_library_insert_legacy ON exercise_library;
DROP POLICY IF EXISTS exercise_library_update_legacy ON exercise_library;
DROP POLICY IF EXISTS exercise_library_delete_legacy ON exercise_library;
DROP POLICY IF EXISTS plan_exercises_select_legacy ON plan_exercises;
DROP POLICY IF EXISTS plan_exercises_insert_legacy ON plan_exercises;
DROP POLICY IF EXISTS plan_exercises_update_legacy ON plan_exercises;
DROP POLICY IF EXISTS plan_exercises_delete_legacy ON plan_exercises;
DROP POLICY IF EXISTS workout_sessions_select_legacy ON workout_sessions;
DROP POLICY IF EXISTS workout_sessions_insert_legacy ON workout_sessions;
DROP POLICY IF EXISTS workout_sessions_update_legacy ON workout_sessions;
DROP POLICY IF EXISTS workout_sessions_delete_legacy ON workout_sessions;
DROP POLICY IF EXISTS session_exercises_select_legacy ON session_exercises;
DROP POLICY IF EXISTS session_exercises_insert_legacy ON session_exercises;
DROP POLICY IF EXISTS session_exercises_update_legacy ON session_exercises;
DROP POLICY IF EXISTS session_exercises_delete_legacy ON session_exercises;
DROP POLICY IF EXISTS session_sets_select_legacy ON session_sets;
DROP POLICY IF EXISTS session_sets_insert_legacy ON session_sets;
DROP POLICY IF EXISTS session_sets_update_legacy ON session_sets;
DROP POLICY IF EXISTS session_sets_delete_legacy ON session_sets;

CREATE POLICY users_select_legacy ON users FOR SELECT USING (true);
CREATE POLICY users_insert_legacy ON users FOR INSERT WITH CHECK (true);
CREATE POLICY users_update_legacy ON users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY users_delete_legacy ON users FOR DELETE USING (true);

CREATE POLICY daily_logs_select_legacy ON daily_logs FOR SELECT USING (true);
CREATE POLICY daily_logs_insert_legacy ON daily_logs FOR INSERT WITH CHECK (true);
CREATE POLICY daily_logs_update_legacy ON daily_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY daily_logs_delete_legacy ON daily_logs FOR DELETE USING (true);

CREATE POLICY meals_select_legacy ON meals FOR SELECT USING (true);
CREATE POLICY meals_insert_legacy ON meals FOR INSERT WITH CHECK (true);
CREATE POLICY meals_update_legacy ON meals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY meals_delete_legacy ON meals FOR DELETE USING (true);

CREATE POLICY weight_logs_select_legacy ON weight_logs FOR SELECT USING (true);
CREATE POLICY weight_logs_insert_legacy ON weight_logs FOR INSERT WITH CHECK (true);
CREATE POLICY weight_logs_update_legacy ON weight_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY weight_logs_delete_legacy ON weight_logs FOR DELETE USING (true);

CREATE POLICY favorite_meals_select_legacy ON favorite_meals FOR SELECT USING (true);
CREATE POLICY favorite_meals_insert_legacy ON favorite_meals FOR INSERT WITH CHECK (true);
CREATE POLICY favorite_meals_update_legacy ON favorite_meals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY favorite_meals_delete_legacy ON favorite_meals FOR DELETE USING (true);

CREATE POLICY workout_plans_select_legacy ON workout_plans FOR SELECT USING (true);
CREATE POLICY workout_plans_insert_legacy ON workout_plans FOR INSERT WITH CHECK (true);
CREATE POLICY workout_plans_update_legacy ON workout_plans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY workout_plans_delete_legacy ON workout_plans FOR DELETE USING (true);

CREATE POLICY exercise_library_select_legacy ON exercise_library FOR SELECT USING (true);
CREATE POLICY exercise_library_insert_legacy ON exercise_library FOR INSERT WITH CHECK (true);
CREATE POLICY exercise_library_update_legacy ON exercise_library FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY exercise_library_delete_legacy ON exercise_library FOR DELETE USING (true);

CREATE POLICY plan_exercises_select_legacy ON plan_exercises FOR SELECT USING (true);
CREATE POLICY plan_exercises_insert_legacy ON plan_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY plan_exercises_update_legacy ON plan_exercises FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY plan_exercises_delete_legacy ON plan_exercises FOR DELETE USING (true);

CREATE POLICY workout_sessions_select_legacy ON workout_sessions FOR SELECT USING (true);
CREATE POLICY workout_sessions_insert_legacy ON workout_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY workout_sessions_update_legacy ON workout_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY workout_sessions_delete_legacy ON workout_sessions FOR DELETE USING (true);

CREATE POLICY session_exercises_select_legacy ON session_exercises FOR SELECT USING (true);
CREATE POLICY session_exercises_insert_legacy ON session_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY session_exercises_update_legacy ON session_exercises FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY session_exercises_delete_legacy ON session_exercises FOR DELETE USING (true);

CREATE POLICY session_sets_select_legacy ON session_sets FOR SELECT USING (true);
CREATE POLICY session_sets_insert_legacy ON session_sets FOR INSERT WITH CHECK (true);
CREATE POLICY session_sets_update_legacy ON session_sets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY session_sets_delete_legacy ON session_sets FOR DELETE USING (true);

REVOKE ALL ON TABLE knowledge_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE knowledge_chunks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE api_rate_limits FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE knowledge_documents TO service_role;
GRANT ALL ON TABLE knowledge_chunks TO service_role;
GRANT ALL ON TABLE api_rate_limits TO service_role;


CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_daily_log ON meals(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_favorite_meals_user ON favorite_meals(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_library_user_name_unique
  ON exercise_library(user_id, lower(trim(name)));
CREATE INDEX IF NOT EXISTS idx_exercise_library_user_recent
  ON exercise_library(user_id, last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_id ON plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_session_exercises_exercise_id ON session_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_status ON session_exercises(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type ON knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_hash ON knowledge_documents(source_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_user_source_ref_unique
  ON knowledge_documents(user_id, source_type, source_ref)
  WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user ON knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_hash ON knowledge_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks
  USING hnsw (embedding halfvec_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at ON api_rate_limits(updated_at);
