const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1ODY0OSwiZXhwIjoyMDkyMzM0NjQ5fQ.9snNk-y91R3a_sheYT6X0kvrT1F8-JMOG6CZ-hhloDw';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.0n7BQTLQ6UR9UD8zDVoE7YaB3J8nXTMj6lHVrIvpFCA';

async function main() {
  // Test anon read of a specific room code (the VR-6335 room)
  const anonClient = createClient(url, anonKey);
  const { data, error } = await anonClient
    .from('exam_rooms')
    .select('room_name, topic, difficulty, question_count, mode, status')
    .eq('code', 'VR-6335')
    .neq('status', 'finished')
    .maybeSingle();
  console.log('Anon read VR-6335:', data);
  console.log('Error:', error);

  // Also try without filter
  const { data: all, error: e2 } = await anonClient.from('exam_rooms').select('id,code').limit(5);
  console.log('Anon all rooms:', all, e2);
}
main();
