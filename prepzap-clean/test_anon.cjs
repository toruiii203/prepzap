const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8';

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('daily_challenges').select('*').eq('challenge_date', '2026-08-28').single();
  console.log("2026-08-28:", data, error);
  
  const { data2, error2 } = await supabase.from('daily_challenges').select('*').eq('challenge_date', '2026-08-29').single();
  console.log("2026-08-29:", data2, error2);
}
run();
