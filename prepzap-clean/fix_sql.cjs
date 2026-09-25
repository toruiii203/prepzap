const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');

const filterSQL = `
-- P0.4 Real Content Moderation Filter (Word boundary regex)
ALTER TABLE public.exam_rooms DROP CONSTRAINT IF EXISTS room_name_blocklist;
ALTER TABLE public.exam_rooms ADD CONSTRAINT room_name_blocklist CHECK (
  room_name !~* '\\yching\\y' AND
  room_name !~* '\\ychong\\y' AND
  room_name !~* '\\ynigg\\w*\\y' AND
  room_name !~* '\\yfag\\w*\\y' AND
  room_name !~* '\\yshit\\w*\\y' AND
  room_name !~* '\\yfuck\\w*\\y' AND
  room_name !~* '\\ybitch\\w*\\y' AND
  LENGTH(room_name) > 1
);
`;

content = content.replace(/-- P0\.4 Real Content Moderation Filter[\s\S]*?LENGTH\(room_name\) > 1\n\);\n/, filterSQL);
fs.writeFileSync('master_setup.sql', content, 'utf8');
