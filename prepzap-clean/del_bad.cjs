require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const badNames = ['Ching chong', 'pogi', 's', 'eg', 'ml'];
  const res = await supabase.from('exam_rooms').delete().in('room_name', badNames);
  console.log(res);
}
check();
