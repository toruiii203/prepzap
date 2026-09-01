const { createClient } = require('@supabase/supabase-js');
const url = 'https://sieizvhprgcqrkalnkht.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8';
const supabase = createClient(url, key);

async function testAuth() {
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'mock@example.com',
    password: 'password123'
  });
  if (signInErr) {
    console.log('SignIn error:', signInErr.message);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: 'mock@example.com',
      password: 'password123'
    });
    if (signUpErr) console.log('SignUp error:', signUpErr.message);
    else console.log('SignUp success');
  }
  
  const { data, error } = await supabase
        .from('exam_rooms')
        .select('room_name, topic, difficulty, question_count, mode, status')
        .limit(1);
  console.log('Auth select:', data);
}
testAuth();
