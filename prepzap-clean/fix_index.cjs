const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');
content = content.replace(/CREATE INDEX ([a-zA-Z0-9_]+)/g, 'CREATE INDEX IF NOT EXISTS $1');
// Just in case it already had IF NOT EXISTS, it would become CREATE INDEX IF NOT EXISTS IF NOT EXISTS
content = content.replace(/CREATE INDEX IF NOT EXISTS IF NOT EXISTS/g, 'CREATE INDEX IF NOT EXISTS');
fs.writeFileSync('master_setup.sql', content, 'utf8');
