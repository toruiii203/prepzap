require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // We can just try to select 1 row from usage_logs to see the shape
  const { data, error } = await supabase.from('usage_logs').select('*').limit(1);
  console.log("usage_logs:", data, error);
}
check();
