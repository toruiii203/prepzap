const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('exam_rooms').select('*').limit(1);
  console.log('Room:', data);
  // How to read pg_policies using REST? Usually we can't unless it's exposed.
}
check();
