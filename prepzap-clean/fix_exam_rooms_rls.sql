-- =====================================================================
-- FIX: Allow anonymous users to read exam_rooms for invite links
-- Run this in your Supabase Dashboard > SQL Editor
-- =====================================================================

-- Drop any existing conflicting read policies
DROP POLICY IF EXISTS "Allow anyone to read exam rooms" ON public.exam_rooms;
DROP POLICY IF EXISTS "anon_read_exam_rooms" ON public.exam_rooms;
DROP POLICY IF EXISTS "Public can read exam rooms" ON public.exam_rooms;

-- Create new open read policy for ALL roles (anon + authenticated)
CREATE POLICY "Public can read exam rooms"
ON public.exam_rooms
FOR SELECT
USING (true);

-- Verify: after running this, anon users should be able to read rooms
-- Test with: SELECT * FROM exam_rooms WHERE code = 'VR-6335';
