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
  // Read and strip BOM if present
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  combined += content + '\n\n';
}

const regex = /CREATE POLICY "([^"]+)"\s*ON ([\w\.]+)/gi;
let match;
const policies = [];

while ((match = regex.exec(combined)) !== null) {
  policies.push({ name: match[1], table: match[2] });
}

let drops = '';
policies.forEach(p => {
  drops += `DROP POLICY IF EXISTS "${p.name}" ON ${p.table};\n`;
});

fs.writeFileSync('master_setup.sql', drops + '\n' + combined, 'utf8');
