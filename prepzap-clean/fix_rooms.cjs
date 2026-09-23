const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');

const filterSQL = `
-- P0.4 Content Moderation Filter
ALTER TABLE public.exam_rooms DROP CONSTRAINT IF EXISTS no_test_rooms;
ALTER TABLE public.exam_rooms ADD CONSTRAINT no_test_rooms CHECK (room_name NOT ILIKE '%test%' AND room_name NOT ILIKE '%mock%');
`;

if (!content.includes('no_test_rooms')) {
  content += filterSQL;
  fs.writeFileSync('master_setup.sql', content, 'utf8');
}
