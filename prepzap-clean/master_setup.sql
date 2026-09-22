-- Create Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes"
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
ON public.notes FOR DELETE
USING (auth.uid() = user_id);


-- Create Note Links Table (Join Table)
CREATE TABLE IF NOT EXISTS public.note_links (
    source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    PRIMARY KEY (source_note_id, target_note_id)
);

-- Enable RLS
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- Policy: Can view links if you own the source note
DROP POLICY IF EXISTS "Users can view links for their notes" ON public.note_links;
CREATE POLICY "Users can view links for their notes"
ON public.note_links FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.notes 
        WHERE notes.id = note_links.source_note_id 
        AND notes.user_id = auth.uid()
    )
);

-- Policy: Can manage links if you own the source note
DROP POLICY IF EXISTS "Users can manage links for their notes" ON public.note_links;
CREATE POLICY "Users can manage links for their notes"
ON public.note_links FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.notes 
        WHERE notes.id = note_links.source_note_id 
        AND notes.user_id = auth.uid()
    )
);


-- Fix missing profiles
insert into public.profiles (id, full_name, email, plan, streak_days, onboarding_complete)
select id, raw_user_meta_data->>'full_name', email, 'free', 0, true
from auth.users
where not exists (select 1 from public.profiles where profiles.id = auth.users.id);

-- Ensure RLS allows usage_logs
alter table public.usage_logs enable row level security;



DROP POLICY IF EXISTS "Users can insert their own usage logs" ON usage_logs;
create policy "Users can insert their own usage logs"
on usage_logs for insert
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own usage logs" ON usage_logs;
create policy "Users can view their own usage logs"
on usage_logs for select
using (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.user_skills (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    source_id text NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own skills" ON public.user_skills;
CREATE POLICY "Users can manage their own skills" ON public.user_skills 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.study_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    tool text NOT NULL,
    source_id text,
    score numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own study activity" ON public.study_activity;
CREATE POLICY "Users can manage their own study activity" ON public.study_activity 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_study_activity_user_source ON public.study_activity (user_id, source_id);


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
CREATE POLICY "Users can read own arcade cache" ON public.arcade_cache FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own arcade cache" ON public.arcade_cache;
CREATE POLICY "Users can insert own arcade cache" ON public.arcade_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own arcade cache" ON public.arcade_cache;
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
CREATE POLICY "Users can read own study activity" ON public.study_activity FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own study activity" ON public.study_activity;
CREATE POLICY "Users can insert own study activity" ON public.study_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_activity_user_source ON public.study_activity (user_id, source_id);


CREATE TABLE IF NOT EXISTS public.daily_challenge_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_date text NOT NULL,
    score integer NOT NULL,
    time_taken_seconds integer NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenge_submissions ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Users can read all submissions" ON public.daily_challenge_submissions;
CREATE POLICY "Users can read all submissions" ON public.daily_challenge_submissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own submission" ON public.daily_challenge_submissions;
CREATE POLICY "Users can insert own submission" ON public.daily_challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.exam_rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_name text NOT NULL,
    topic text NOT NULL,
    mode text NOT NULL,
    difficulty text NOT NULL,
    question_count integer NOT NULL,
    time_limit integer NOT NULL,
    status text NOT NULL,
    is_public boolean DEFAULT false,
    questions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;




DROP POLICY IF EXISTS "Allow anyone to read exam rooms" ON public.exam_rooms;
CREATE POLICY "Allow anyone to read exam rooms" ON public.exam_rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own rooms" ON public.exam_rooms;
CREATE POLICY "Users can insert own rooms" ON public.exam_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Host can update own rooms" ON public.exam_rooms;
CREATE POLICY "Host can update own rooms" ON public.exam_rooms FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Host can delete own rooms" ON public.exam_rooms;
CREATE POLICY "Host can delete own rooms" ON public.exam_rooms FOR DELETE USING (auth.uid() = host_id);

CREATE TABLE IF NOT EXISTS public.room_presence (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES public.exam_rooms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    status text NOT NULL,
    score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_presence ENABLE ROW LEVEL SECURITY;




DROP POLICY IF EXISTS "Anyone can read room presence" ON public.room_presence;
CREATE POLICY "Anyone can read room presence" ON public.room_presence FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own presence" ON public.room_presence;
CREATE POLICY "Users can insert own presence" ON public.room_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own presence" ON public.room_presence;
CREATE POLICY "Users can update own presence" ON public.room_presence FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own presence" ON public.room_presence;
CREATE POLICY "Users can delete own presence" ON public.room_presence FOR DELETE USING (auth.uid() = user_id);




-- Ensure study_activity score is numeric
DO $$
BEGIN
  ALTER TABLE public.study_activity ALTER COLUMN score TYPE numeric;
EXCEPTION
  WHEN undefined_table THEN
    -- Do nothing if table somehow doesn't exist
END $$;
