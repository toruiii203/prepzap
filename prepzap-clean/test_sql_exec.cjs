const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8';
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';

async function main() {
  // Try the Supabase REST API /rest/v1/ endpoint to execute raw SQL
  // Supabase allows raw SQL via the "pg" extension or via stored procedures
  // Let's try a known approach: POST to /rest/v1/ with a SELECT pg_catalog query
  
  // Actually, the cleanest way is to try the Management REST API
  // The project ref is embedded in the service key JWT
  const projectRef = 'sieizvhprgcqrkalnkht';
  
  // Try Supabase Management API (requires management token, not service role)
  // But we can try with service role header as Authorization
  const sql = [
    'DROP POLICY IF EXISTS "Allow anyone to read exam rooms" ON public.exam_rooms;',
    'DROP POLICY IF EXISTS "anon_read_exam_rooms" ON public.exam_rooms;',
    'DROP POLICY IF EXISTS "Public can read exam rooms" ON public.exam_rooms;',
    'CREATE POLICY "Public can read exam rooms" ON public.exam_rooms FOR SELECT USING (true);',
  ].join(' ');
  
  // Try via the database SQL endpoint
  const resp = await fetch(`${url}/rest/v1/`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey 
    },
  });
  console.log('REST root status:', resp.status, await resp.text().then(t => t.substring(0, 200)));
  
  // Try calling a stored proc approach - create a temp function and call it
  // This is via the pg REST endpoint that supabase exposes
  const resp2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + serviceKey 
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('Management API status:', resp2.status, await resp2.text().then(t => t.substring(0, 300)));
}

main().catch(console.error);
