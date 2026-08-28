const fs = require('fs');
let code = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

code = code.replace(
  '  const RoomsCard = () => (',
  '  const renderRoomsCard = () => ('
);
code = code.replace(/<RoomsCard \/>/g, '{renderRoomsCard()}');

fs.writeFileSync('src/pages/Arena.tsx', code);
