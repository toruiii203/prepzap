require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const res = await supabase.from('exam_rooms').delete().ilike('room_name', '%test%');
  console.log(res);
}
check();
