CREATE TABLE public.arcade_cache (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id text NOT NULL,
    game_type text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(source_id, game_type)
);

ALTER TABLE public.arcade_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read arcade cache" ON public.arcade_cache FOR SELECT USING (true);
CREATE POLICY "Users can insert arcade cache" ON public.arcade_cache FOR INSERT WITH CHECK (true);
