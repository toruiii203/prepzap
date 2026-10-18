-- ==============================================================================
-- STUDENIUS: Study Circle & Campus Vault Database Setup
-- Run this in your Supabase SQL Editor to enable real multi-user community sync!
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

-- 3. Create the community_vault_notes table
CREATE TABLE IF NOT EXISTS public.community_vault_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name text NOT NULL,
    author_avatar text DEFAULT '📝',
    author_code text,
    title text NOT NULL,
    subject text NOT NULL,
    subject_badge_color text DEFAULT 'bg-blue-50 text-blue-700 border-blue-300',
    tags text[] DEFAULT '{}',
    summary text,
    content text NOT NULL,
    read_time text DEFAULT '5 min read',
    likes_count integer DEFAULT 0,
    downloads_count integer DEFAULT 0,
    attachment_url text,
    is_official_seed boolean DEFAULT false,
    is_reported boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_notes_subject ON public.community_vault_notes(subject);
CREATE INDEX IF NOT EXISTS idx_vault_notes_created_at ON public.community_vault_notes(created_at DESC);

ALTER TABLE public.community_vault_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view vault notes" ON public.community_vault_notes;
CREATE POLICY "Public can view vault notes"
ON public.community_vault_notes FOR SELECT
USING (is_reported = false OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can publish vault notes" ON public.community_vault_notes;
CREATE POLICY "Users can publish vault notes"
ON public.community_vault_notes FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Authors can update their notes" ON public.community_vault_notes;
CREATE POLICY "Authors can update their notes"
ON public.community_vault_notes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can delete their notes" ON public.community_vault_notes;
CREATE POLICY "Authors can delete their notes"
ON public.community_vault_notes FOR DELETE
USING (auth.uid() = user_id);
