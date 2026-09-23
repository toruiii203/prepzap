require('dotenv').config();
async function check() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const swagger = await res.json();
  console.log(swagger);
}
check();
