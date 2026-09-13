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

CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
CREATE POLICY "Users can manage links for their notes"
ON public.note_links FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.notes 
        WHERE notes.id = note_links.source_note_id 
        AND notes.user_id = auth.uid()
    )
);
