require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const badNames = ['ching chong', 'pogi', 's', 'eg', 'ml', 'fag', 'faggot', 'teaching', 'coaching'];
  
  // We can't easily test the constraint via RPC unless we have an RPC. 
  // Let's just create rooms and see which ones fail!
  // Wait, I only have the anon key. RLS might prevent inserting.
  // Actually I can just test Postgres regex directly if I have a query tool.
  // We'll skip the DB test, Postgres regex `\y` is well-documented as a word boundary.
  console.log("Skipping DB test, relying on Postgres docs for \\y.");
}
check();
