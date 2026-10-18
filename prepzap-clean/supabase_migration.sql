-- ==============================================================================
-- STUDENIUS DATABASE MIGRATION: Complete Backend Tables & Policies
-- ==============================================================================

-- 1. NOTES TABLE (Personal Notes)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- 2. NOTE LINKS TABLE
CREATE TABLE IF NOT EXISTS public.note_links (
    source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    PRIMARY KEY (source_note_id, target_note_id)
);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view links for their notes" ON public.note_links;
CREATE POLICY "Users can view links for their notes" ON public.note_links FOR SELECT
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_links.source_note_id AND notes.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage links for their notes" ON public.note_links;
CREATE POLICY "Users can manage links for their notes" ON public.note_links FOR ALL
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_links.source_note_id AND notes.user_id = auth.uid()));

-- 3. COMMUNITY VAULT NOTES
CREATE TABLE IF NOT EXISTS public.community_vault_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name text NOT NULL,
    author_code text,
    author_avatar text DEFAULT '/buddies/fox_scholar.png',
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
    is_public boolean DEFAULT true,
    share_slug text UNIQUE,
    is_official_seed boolean DEFAULT false,
    is_reported boolean DEFAULT false,
    report_reason text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_notes_subject ON public.community_vault_notes(subject);
CREATE INDEX IF NOT EXISTS idx_vault_notes_created ON public.community_vault_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_notes_slug ON public.community_vault_notes(share_slug);

ALTER TABLE public.community_vault_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view vault notes" ON public.community_vault_notes;
CREATE POLICY "Public can view vault notes" ON public.community_vault_notes FOR SELECT
USING ((is_public = true AND is_reported = false) OR (auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can publish vault notes" ON public.community_vault_notes;
CREATE POLICY "Users can publish vault notes" ON public.community_vault_notes FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Authors can update their notes" ON public.community_vault_notes;
CREATE POLICY "Authors can update their notes" ON public.community_vault_notes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authors can delete their notes" ON public.community_vault_notes;
CREATE POLICY "Authors can delete their notes" ON public.community_vault_notes FOR DELETE
USING (auth.uid() = user_id);

-- 4. NOTE LIKES
CREATE TABLE IF NOT EXISTS public.note_likes (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id uuid NOT NULL REFERENCES public.community_vault_notes(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, note_id)
);

ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view note likes" ON public.note_likes;
CREATE POLICY "Public can view note likes" ON public.note_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like notes" ON public.note_likes;
CREATE POLICY "Users can like notes" ON public.note_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike notes" ON public.note_likes;
CREATE POLICY "Users can unlike notes" ON public.note_likes FOR DELETE USING (auth.uid() = user_id);

-- 5. PROFILE HEARTS (No self-hearts, unique pair)
CREATE TABLE IF NOT EXISTS public.profile_hearts (
    giver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (giver_id, receiver_id),
    CONSTRAINT no_self_hearts CHECK (giver_id <> receiver_id)
);

ALTER TABLE public.profile_hearts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profile hearts" ON public.profile_hearts;
CREATE POLICY "Public can view profile hearts" ON public.profile_hearts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can give hearts" ON public.profile_hearts;
CREATE POLICY "Users can give hearts" ON public.profile_hearts FOR INSERT
WITH CHECK (auth.uid() = giver_id AND giver_id <> receiver_id);

DROP POLICY IF EXISTS "Users can remove hearts" ON public.profile_hearts;
CREATE POLICY "Users can remove hearts" ON public.profile_hearts FOR DELETE
USING (auth.uid() = giver_id);

-- 6. STUDY PARTNERS (Mutual request, acceptance, and block support)
CREATE TABLE IF NOT EXISTS public.study_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_code text NOT NULL,
    partner_name text NOT NULL,
    user_code text,
    user_name text,
    status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, partner_id)
);

ALTER TABLE public.study_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view study partners" ON public.study_partners;
CREATE POLICY "Users can view study partners" ON public.study_partners FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can add study partners" ON public.study_partners;
CREATE POLICY "Users can add study partners" ON public.study_partners FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update study partners" ON public.study_partners;
CREATE POLICY "Users can update study partners" ON public.study_partners FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "Users can remove study partners" ON public.study_partners;
CREATE POLICY "Users can remove study partners" ON public.study_partners FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- 7. UNIVERSAL SHARED MATERIALS
DROP TABLE IF EXISTS public.shared_materials CASCADE;
CREATE TABLE public.shared_materials (
    share_slug text PRIMARY KEY,
    item_type text NOT NULL CHECK (item_type IN ('guide', 'flashcards', 'quiz')),
    title text NOT NULL,
    subject text NOT NULL,
    creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_name text NOT NULL,
    creator_code text,
    payload jsonb NOT NULL,
    is_public boolean DEFAULT true,
    is_reported boolean DEFAULT false,
    view_count integer DEFAULT 0,
    clone_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_materials_type ON public.shared_materials(item_type);

ALTER TABLE public.shared_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view shared materials" ON public.shared_materials;
CREATE POLICY "Public can view shared materials" ON public.shared_materials FOR SELECT
USING (is_reported = false);

DROP POLICY IF EXISTS "Anyone can create shared materials" ON public.shared_materials;
CREATE POLICY "Anyone can create shared materials" ON public.shared_materials FOR INSERT
WITH CHECK (true);

-- 8. CONTENT REPORTS
DROP TABLE IF EXISTS public.content_reports CASCADE;
CREATE TABLE public.content_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content_type text NOT NULL CHECK (content_type IN ('vault_note', 'shared_material', 'profile')),
    content_id text NOT NULL,
    reason text NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit content report" ON public.content_reports;
CREATE POLICY "Anyone can submit content report" ON public.content_reports FOR INSERT
WITH CHECK (true);
