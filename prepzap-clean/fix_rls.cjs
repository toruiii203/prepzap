const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const supabase = createClient(url, key);

async function fix() {
  const { data, error } = await supabase.rpc('query_sql', {
    sql: 'CREATE POLICY \"Allow anyone to read exam rooms\" ON public.exam_rooms FOR SELECT USING (true);'
  });
  console.log('Result 1:', error || data);
  const { data: d2, error: e2 } = await supabase.rpc('query_sql', {
    sql: 'ALTER TABLE public.exam_rooms ENABLE ROW LEVEL SECURITY;'
  });
  console.log('Result 2:', e2 || d2);
}
fix();
