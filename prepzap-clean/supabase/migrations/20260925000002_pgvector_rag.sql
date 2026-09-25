-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing document chunks and their embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL, -- Ties back to the local/remote file ID
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384), -- Xenova/all-MiniLM-L6-v2 produces 384-dimensional vectors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own chunks
DROP POLICY IF EXISTS "Users can manage own chunks" ON public.document_chunks;
CREATE POLICY "Users can manage own chunks"
ON public.document_chunks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a matching function for similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(384),
    match_threshold float,
    match_count int,
    p_user_id uuid,
    p_source_ids text[]
)
RETURNS TABLE (
    id uuid,
    source_id text,
    chunk_index integer,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.source_id,
        document_chunks.chunk_index,
        document_chunks.content,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE document_chunks.user_id = p_user_id
      AND document_chunks.source_id = ANY(p_source_ids)
      AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
