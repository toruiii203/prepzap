const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const supabase = createClient(url, serviceKey);

async function main() {
  // Check RLS policies on exam_rooms
  const { data, error } = await supabase.rpc('query_sql', {
    sql: "SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename='exam_rooms';"
  });
  console.log('Policies:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}
main();
