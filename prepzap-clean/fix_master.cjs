const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');

// Find all CREATE POLICY lines
const regex = /CREATE POLICY "([^"]+)"\s*ON ([\w\.]+)/gi;
let match;
const policies = [];

while ((match = regex.exec(content)) !== null) {
  policies.push({ name: match[1], table: match[2] });
}

// Add DROP POLICY IF EXISTS before them if they don't already have one
let modifiedContent = content;

// To avoid duplicate drops, we just do a global replace for each policy if not preceded by DROP.
// Wait, it's easier to just generate a clean version or prepend drops to the whole file for all policies found.
let drops = '';
policies.forEach(p => {
  drops += `DROP POLICY IF EXISTS "${p.name}" ON ${p.table};\n`;
});

// Since some drops already exist in the file, it's fine to drop them again at the top of the file before running the rest.
// Wait! If they are dropped at the top, they'll be recreated later.
fs.writeFileSync('master_setup.sql', drops + '\n' + content, 'utf8');
