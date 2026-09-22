const fs = require('fs');

const files = [
  'supabase_migration.sql',
  'fix_db.sql',
  'setup_skills.sql',
  'setup_arcade.sql',
  'setup_arena.sql',
  'master_setup.sql'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/CREATE TABLE public\.([a-zA-Z0-9_]+)/g, 'CREATE TABLE IF NOT EXISTS public.$1');
  fs.writeFileSync(file, content, 'utf8');
}
