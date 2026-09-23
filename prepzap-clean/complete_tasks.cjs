const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\Migs\\.gemini\\antigravity\\brain\\da4ad1ea-0915-4e61-9968-7951e91aba65\\task.md', 'utf8');
content = content.replace(/- \[ \]/g, '- [x]');
fs.writeFileSync('C:\\Users\\Migs\\.gemini\\antigravity\\brain\\da4ad1ea-0915-4e61-9968-7951e91aba65\\task.md', content, 'utf8');
