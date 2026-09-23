const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');

const filterSQL = `
-- P0.4 Real Content Moderation Filter
ALTER TABLE public.exam_rooms DROP CONSTRAINT IF EXISTS room_name_blocklist;
ALTER TABLE public.exam_rooms ADD CONSTRAINT room_name_blocklist CHECK (
  room_name NOT ILIKE '%ching%' AND
  room_name NOT ILIKE '%chong%' AND
  room_name NOT ILIKE '%nigg%' AND
  room_name NOT ILIKE '%fag%' AND
  room_name NOT ILIKE '%shit%' AND
  room_name NOT ILIKE '%fuck%' AND
  room_name NOT ILIKE '%bitch%' AND
  LENGTH(room_name) > 1
);
`;

content = content.replace(/ALTER TABLE public\.exam_rooms DROP CONSTRAINT IF EXISTS no_test_rooms;[\s\S]*?mock%'\);/, filterSQL);
fs.writeFileSync('master_setup.sql', content, 'utf8');
