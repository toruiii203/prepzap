-- 1. Add columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Add Postgres check constraints as backstop
ALTER TABLE public.exam_rooms 
  ADD CONSTRAINT exam_rooms_name_length_check CHECK (char_length(trim(room_name)) >= 3 AND char_length(trim(room_name)) <= 100) NOT VALID,
  ADD CONSTRAINT exam_rooms_topic_length_check CHECK (char_length(trim(topic)) >= 3 AND char_length(trim(topic)) <= 100) NOT VALID;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length_check CHECK (username IS NULL OR (char_length(trim(username)) >= 3 AND char_length(trim(username)) <= 30)) NOT VALID,
  ADD CONSTRAINT profiles_display_name_length_check CHECK (display_name IS NULL OR (char_length(trim(display_name)) >= 3 AND char_length(trim(display_name)) <= 50)) NOT VALID;

-- 3. Update RLS policies to prevent direct inserts/updates
DROP POLICY IF EXISTS "Users can insert own rooms" ON public.exam_rooms;

CREATE OR REPLACE FUNCTION check_moderated_columns()
RETURNS trigger AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      IF NEW.username IS DISTINCT FROM OLD.username OR NEW.display_name IS DISTINCT FROM OLD.display_name THEN
        RAISE EXCEPTION 'Updates to username and display_name must go through the moderation API.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_moderation ON public.profiles;
CREATE TRIGGER tr_profiles_moderation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_moderated_columns();
