const fs = require('fs');
let code = fs.readFileSync('public/sw.js', 'utf8');

code = code.replace(
  'const SW_VERSION = "v1";',
  'const SW_VERSION = "v2";'
);

fs.writeFileSync('public/sw.js', code);
