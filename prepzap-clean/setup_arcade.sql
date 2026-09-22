-- 1. ARCADE CACHE TABLE
CREATE TABLE IF NOT EXISTS public.arcade_cache (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id text NOT NULL,
    game_type text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, source_id, game_type)
);

ALTER TABLE public.arcade_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own arcade cache" ON public.arcade_cache;
DROP POLICY IF EXISTS "Users can insert own arcade cache" ON public.arcade_cache;
DROP POLICY IF EXISTS "Users can update own arcade cache" ON public.arcade_cache;
CREATE POLICY "Users can read own arcade cache" ON public.arcade_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own arcade cache" ON public.arcade_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own arcade cache" ON public.arcade_cache FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. STUDY ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.study_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool text NOT NULL,
    source_id text,
    score numeric NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own study activity" ON public.study_activity;
DROP POLICY IF EXISTS "Users can insert own study activity" ON public.study_activity;
CREATE POLICY "Users can read own study activity" ON public.study_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study activity" ON public.study_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_activity_user_source ON public.study_activity (user_id, source_id);
