-- 1. Delete the offending rooms
DELETE FROM public.exam_rooms 
WHERE room_name IN ('Ching chong', 'pogi', 's', 'eg', 'ml');

-- 2. Apply the strong regex constraint
ALTER TABLE public.exam_rooms DROP CONSTRAINT IF EXISTS room_name_blocklist;
ALTER TABLE public.exam_rooms DROP CONSTRAINT IF EXISTS no_test_rooms;

ALTER TABLE public.exam_rooms ADD CONSTRAINT room_name_blocklist CHECK (
  room_name !~* '\yching\y' AND
  room_name !~* '\ychong\y' AND
  room_name !~* '\ynigg\w*\y' AND
  room_name !~* '\yfag\w*\y' AND
  room_name !~* '\yshit\w*\y' AND
  room_name !~* '\yfuck\w*\y' AND
  room_name !~* '\ybitch\w*\y' AND
  LENGTH(room_name) > 1
);
