const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8';

// Use the Management API to apply RLS policy via SQL
const projectRef = 'sieizvhprgcqrkalnkht';

async function applyPolicy() {
  // Use the pg REST approach: call the Supabase Management API
  // We'll use a direct SQL approach via the Supabase REST API with service role
  const svc = createClient(url, serviceKey, { db: { schema: 'public' } });

  // We need to execute raw SQL. Let's try using the pg endpoint
  const sql = `
    -- Drop old policy if exists
    DROP POLICY IF EXISTS "Allow anyone to read exam rooms" ON public.exam_rooms;
    DROP POLICY IF EXISTS "anon_read_exam_rooms" ON public.exam_rooms;
    DROP POLICY IF EXISTS "Public can read exam rooms" ON public.exam_rooms;
    
    -- Create new permissive read policy for ALL roles (including anon)
    CREATE POLICY "Public can read exam rooms"
    ON public.exam_rooms
    FOR SELECT
    USING (true);
  `;

  console.log('Applying RLS fix via Management API...');
  
  // Try using the REST SQL endpoint
  const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql }),
  });
  const result = await response.text();
  console.log('RPC exec_sql result:', result);
  
  // Also try the pg endpoint
  const pgResponse = await fetch(`${url}/pg/sql`, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const pgResult = await pgResponse.text();
  console.log('PG SQL result:', pgResult);
}

async function verify() {
  const anonClient = createClient(url, anonKey);
  const { data, error } = await anonClient
    .from('exam_rooms')
    .select('room_name, topic, difficulty, question_count, mode, status')
    .eq('code', 'VR-6335')
    .neq('status', 'finished')
    .maybeSingle();
  console.log('\nVerification - Anon read VR-6335:', data);
  console.log('Error:', error);
}

applyPolicy().then(verify).catch(console.error);
