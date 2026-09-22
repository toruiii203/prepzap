const fs = require('fs');

const files = [
  'supabase_migration.sql',
  'fix_db.sql',
  'setup_skills.sql',
  'setup_arcade.sql',
  'setup_arena.sql'
];

let combined = '';
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  // Replace all CREATE POLICY lines with DROP POLICY IF EXISTS followed by CREATE POLICY.
  // Wait, if some files ALREADY have DROP POLICY IF EXISTS, we might get duplicates,
  // but duplicates of DROP POLICY IF EXISTS are perfectly fine and safe.
  
  // Actually, to be very clean:
  // First, remove existing DROP POLICY IF EXISTS lines to avoid clutter
  content = content.replace(/DROP POLICY IF EXISTS[^;]+;/gi, '');
  
  // Then, for every CREATE POLICY, prepend a DROP POLICY IF EXISTS
  content = content.replace(/(CREATE POLICY "([^"]+)"\s*ON ([\w\.]+))/gi, 'DROP POLICY IF EXISTS "$2" ON $3;\n$1');
  
  combined += content + '\n\n';
}

fs.writeFileSync('master_setup.sql', combined, 'utf8');
