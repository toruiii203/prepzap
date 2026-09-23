require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  // Let's try inserting an empty object to see what NOT NULL columns are missing
  const { data, error } = await supabase.from('usage_logs').insert([{}]).select();
  console.log("usage_logs insert error:", error);
}
check();
