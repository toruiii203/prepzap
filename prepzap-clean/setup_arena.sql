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
DROP POLICY IF EXISTS "Users can insert own submission" ON public.daily_challenge_submissions;
CREATE POLICY "Users can read all submissions" ON public.daily_challenge_submissions FOR SELECT USING (true);
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
DROP POLICY IF EXISTS "Users can insert own rooms" ON public.exam_rooms;
DROP POLICY IF EXISTS "Host can update own rooms" ON public.exam_rooms;
DROP POLICY IF EXISTS "Host can delete own rooms" ON public.exam_rooms;
CREATE POLICY "Allow anyone to read exam rooms" ON public.exam_rooms FOR SELECT USING (true);
CREATE POLICY "Users can insert own rooms" ON public.exam_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update own rooms" ON public.exam_rooms FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
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
DROP POLICY IF EXISTS "Users can insert own presence" ON public.room_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.room_presence;
DROP POLICY IF EXISTS "Users can delete own presence" ON public.room_presence;
CREATE POLICY "Anyone can read room presence" ON public.room_presence FOR SELECT USING (true);
CREATE POLICY "Users can insert own presence" ON public.room_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presence" ON public.room_presence FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own presence" ON public.room_presence FOR DELETE USING (auth.uid() = user_id);
