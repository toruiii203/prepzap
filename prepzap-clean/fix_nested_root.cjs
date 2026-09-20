const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// The file currently has:
// <div id="root" vaul-drawer-wrapper="">
// <div id="root" vaul-drawer-wrapper="">
//   <div class="static-skel">

content = content.replace(/<div id="root" vaul-drawer-wrapper="">\s*<div id="root" vaul-drawer-wrapper="">/, '<div id="root" vaul-drawer-wrapper="">');
content = content.replace(/<\/div>\s*<\/div>\s*<script type="module" src="\/src\/main\.tsx"><\/script>/, '</div>\n    <script type="module" src="/src/main.tsx"></script>');

fs.writeFileSync('index.html', content, 'utf8');
