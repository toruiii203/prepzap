-- ==============================================================================
-- STUDENIUS: Study Circle & Partner Synchronization Setup
-- Run this in your Supabase SQL Editor to enable real multi-user friend linking
-- ==============================================================================

-- 1. Ensure profiles are publicly readable so friends can resolve names and avatars
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are readable" ON public.profiles;
CREATE POLICY "Public profiles are readable"
ON public.profiles FOR SELECT
USING (true);

-- 2. Create the study_partners table
CREATE TABLE IF NOT EXISTS public.study_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_code text NOT NULL,
    partner_name text NOT NULL,
    user_code text,
    user_name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, partner_id)
);

-- 3. Enable RLS and permissions for study_partners
ALTER TABLE public.study_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their friendships" ON public.study_partners;
CREATE POLICY "Users can view their friendships"
ON public.study_partners FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can insert their friendships" ON public.study_partners;
CREATE POLICY "Users can insert their friendships"
ON public.study_partners FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.study_partners;
CREATE POLICY "Users can delete their friendships"
ON public.study_partners FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = partner_id);
